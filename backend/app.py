# backend/app.py
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, request
from flask_cors import CORS

# Global variables - will be initialized in if __name__ == "__main__"
db = None
client = None
INDEX_NAME = None
auth = None

# Configuration
DEBUG = True

# Instantiate the app
app = Flask(__name__)

# Single clean CORS configuration
# CORS(app, supports_credentials=True, origins="*")
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
})


@app.route('/user_demographics/<user_id>')
def get_user_demographics(user_id):
    if not db:
        return {"error": "Firebase not initialized"}, 500
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            return user_doc.to_dict()
        else:
            return {"error": "User not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/api/search')
def search_recipes():
    if not client:
        return jsonify({"error": "Elasticsearch not initialized"}), 500
    
    query = request.args.get('q', "")
    min_protein = request.args.get('min_protein', type=float)
    min_calories = request.args.get('min_calories', type=float)
    max_calories = request.args.get('max_calories', type=float)

    try:
        must_clauses = []
        if query:
            must_clauses.append({
                "multi_match": {
                    "query": query,
                    "fields": ["name", "ingredients"],
                    "fuzziness": "AUTO"
                }
            })
        else:
            must_clauses.append({"match_all": {}})

        filters = []

        protein = {}
        if min_protein is not None:
            protein['gte'] = min_protein
        if protein:
            filters.append({"range": {"protein_grams": protein}})

        calories_range = {}
        if min_calories is not None:
            calories_range['gte'] = min_calories
        if max_calories is not None:
            calories_range['lte'] = max_calories
        if calories_range:
            filters.append({"range": {"calories": calories_range}})

        search_body = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "filter": filters
                }
            }
        }

        response = client.search(index=INDEX_NAME, body=search_body)
        results = [hit['_source'] for hit in response['hits']['hits']]
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"An error occurred during search: {e}"}), 500


@app.route('/api/recommendations/<user_id>')
def get_recommendations(user_id):
    if not db or not client:
        return jsonify({"error": "Services not initialized"}), 500

    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = user_doc.to_dict()
        macros = user_data.get('macros')

        if not macros:
            return jsonify({"error": "User has no macro data"}), 404

        daily_calories = float(macros.get('calories', 2000))
        daily_protein = float(macros.get('protein', 50))
        daily_carbs = float(macros.get('carbs', 300))
        daily_fat = float(macros.get('fat', 70))

    except Exception as e:
        return jsonify({"error": f"Firebase error: {str(e)}"}), 500

    target_calories = daily_calories / 3
    target_protein = daily_protein / 3
    target_carbs = daily_carbs / 3
    target_fat = daily_fat / 3

    search_body = {
        "size": 10,
        "query": {
            "function_score": {
                "query": {"match_all": {}},
                "functions": [
                    {"gauss": {"calories": {"origin": target_calories, "offset": 50, "scale": 100}}},
                    {"gauss": {"protein_grams": {"origin": target_protein, "offset": 5, "scale": 10}}},
                    {"gauss": {"carbs_grams": {"origin": target_carbs, "offset": 10, "scale": 20}}},
                    {"gauss": {"fat_grams": {"origin": target_fat, "offset": 5, "scale": 10}}},
                ],
                "score_mode": "multiply",
                "boost_mode": "multiply"
            }
        }
    }

    try:
        response = client.search(index=INDEX_NAME, body=search_body)
        results = [hit['_source'] for hit in response['hits']['hits']]
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"An error occurred during search: {e}"}), 500


@app.route('/add_recipe', methods=['POST'])
def add_recipe():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        recipe = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not recipe:
        return jsonify({"error": "Empty recipe payload"}), 400

    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        id_token = recipe.get('idToken') if isinstance(recipe, dict) else None

    if not id_token:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        source = recipe.get('url') or recipe.get('recipe_name') or recipe.get('name')
        import hashlib
        doc_id = hashlib.sha1(str(source).encode('utf-8')).hexdigest() if source else None

        favs = db.collection('users').document(uid).collection('favorites')
        data_to_save = dict(recipe)
        data_to_save.pop('idToken', None)

        if doc_id:
            favs.document(doc_id).set(data_to_save, merge=True)
        else:
            favs.add(data_to_save)

    except Exception as e:
        return jsonify({"error": f"Failed to save recipe: {e}"}), 500

    return jsonify({"status": "success", "message": "Favorite added"}), 201


@app.route('/favorites', methods=['GET'])
def list_favorites():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        docs = db.collection('users').document(uid).collection('favorites').stream()
        favorites = [{**doc.to_dict(), "_id": doc.id} for doc in docs]
        return jsonify(favorites)
    except Exception as e:
        return jsonify({"error": f"Failed to list favorites: {e}"}), 500


@app.route('/favorites/<fav_id>', methods=['DELETE'])
def delete_favorite_by_id(fav_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        doc_ref = db.collection('users').document(uid).collection('favorites').document(fav_id)
        if not doc_ref.get().exists:
            return jsonify({"error": "Favorite not found"}), 404
        doc_ref.delete()
        return jsonify({"status": "success", "message": "Favorite deleted"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete favorite: {e}"}), 500


@app.route('/favorites', methods=['DELETE'])
def delete_favorite_by_url():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    url = request.args.get('url')
    if not url:
        return jsonify({"error": "Missing url query parameter"}), 400

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        import hashlib
        doc_id = hashlib.sha1(url.encode("utf-8")).hexdigest()
        doc_ref = db.collection('users').document(uid).collection('favorites').document(doc_id)

        if not doc_ref.get().exists:
            return jsonify({"error": "Favorite not found"}), 404

        doc_ref.delete()
        return jsonify({"status": "success", "message": "Favorite deleted"}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete favorite by url: {e}"}), 500


@app.route('/calculate_macros', methods=['POST'])
def calculate_macros():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    data = request.get_json()
    uid = data.get("uid")

    from macro_calculator import macros_calc
    macros = macros_calc(data)

    if uid:
        db.collection("users").document(uid).set({"macros": macros}, merge=True)

    return jsonify(macros)


@app.route('/meal-plan', methods=['POST'])
def save_meal_plan():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if 'plan' not in data:
        return jsonify({"error": "Missing 'plan' field"}), 400

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        db.collection('users').document(uid).collection('meal_plan').document('current').set(
            {"plan": data['plan']},
            merge=True
        )
        return jsonify({"status": "success", "message": "Meal plan saved"}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to save meal plan: {e}"}), 500


@app.route('/meal-plan', methods=['GET'])
def get_meal_plan():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        doc = db.collection('users').document(uid).collection('meal_plan').document('current').get()
        if not doc.exists:
            return jsonify({"error": "No meal plan found"}), 404
        return jsonify(doc.to_dict())
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve meal plan: {e}"}), 500


def format_recipe_for_display(full_recipe):
    if not full_recipe:
        return None
    
    return {
        "name": full_recipe.get("name"),
        "url": full_recipe.get("url"),
        "img_src": full_recipe.get("img_src"),
        "prep_time": full_recipe.get("prep_time"),
        "total_time": full_recipe.get("total_time"),
        "calories": full_recipe.get("calories"),
        "protein_grams": full_recipe.get("protein_grams"),
        "fat_grams": full_recipe.get("fat_grams"),
        "carbs_grams": full_recipe.get("carbs_grams"),
    }


if __name__ == '__main__':
    # Initialize heavy imports only when server starts (not during reload)
    import firebase_admin
    from firebase_admin import credentials
    from firebase_admin import firestore
    from firebase_admin import auth as firebase_auth
    import elastic
    
    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.")
        except ValueError as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
            print("Please ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set and points to a valid service account key.")
        except Exception as e:
            print(f"An unexpected error occurred during Firebase Admin SDK initialization: {e}")

    # Get a Firestore client ONLY IF Firebase was initialized
    if firebase_admin._apps:
        db = firestore.client()
        auth = firebase_auth

    # Initialize Elasticsearch client
    try:
        client = elastic.client
        INDEX_NAME = elastic.INDEX_NAME
        if client and client.ping():
            print("Elasticsearch client connected!")
        else:
            print("Warning: Elasticsearch client not connected")
    except Exception as e:
        print(f"Warning: Could not initialize Elasticsearch client: {e}")

    # Run Flask app with reloader disabled to prevent freeze issues
    app.run(debug=False, use_reloader=False)
