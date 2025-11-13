# backend/app.py
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import auth
from elastic import client, INDEX_NAME
from macro_calculator import macros_calc 


# Configuration
DEBUG = True

# Instantiate the app
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])  # allow frontend
app.config.from_object(__name__)

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    try:
        # The Admin SDK will automatically look for the GOOGLE_APPLICATION_CREDENTIALS env var
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully using GOOGLE_APPLICATION_CREDENTIALS.")
    except ValueError as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        print("Please ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set and points to a valid service account key.")
    except Exception as e:
        print(f"An unexpected error occurred during Firebase Admin SDK initialization: {e}")

# Get a Firestore client ONLY IF Firebase was initialized       
db = None
if firebase_admin._apps:
    db = firestore.client()

# Enable CORS
CORS(app, resources={r'/api/*': {'origins': '*'}, r'/add_recipe': {'origins': '*'}, r'/favorites': {'origins': '*'}})

@app.route('/user_demographics/<user_id>')
def get_user_demographics(user_id):
    if not db:
        return {"error": "Firebase not initialized"}, 500
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            demographics = user_doc.to_dict()
            return demographics
        else:
            return {"error": "User not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500
    
@app.route('/api/search')
def search_recipes():
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
            filters.append({
                "range": {
                    "protein_grams": protein
                }
            })

        calories_range = {}
        if min_calories is not None:
            calories_range['gte'] = min_calories
        if max_calories is not None:
            calories_range['lte'] = max_calories
        if calories_range:
            filters.append({
                "range": {
                    "calories": calories_range
                }
            })

        search_body = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "filter": filters
                }
            }
        }
        
        response = client.search(
            index=INDEX_NAME,
            body=search_body
        )
        
        results = [hit['_source'] for hit in response['hits']['hits']]
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": f"An error occurred during search: {e}"}), 500

@app.route('/api/recommendations/<user_id>')
def get_recommendations(user_id):
    """
    Fetches user's macro goals from Firestore and returns 10 random recipes
    from Elasticsearch that fit those goals.
    """
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    # 1. Fetch user macros from Firebase
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        macros = user_data.get('macros')

        if not macros:
            return jsonify({"error": "User has no macro data"}), 404

        # Get daily goals from Firestore
        daily_calories = float(macros.get('calories', 2000))
        daily_protein = float(macros.get('protein', 50))
        daily_carbs = float(macros.get('carbs', 300))
        daily_fat = float(macros.get('fat', 70))

    except Exception as e:
        return jsonify({"error": f"Firebase error: {str(e)}"}), 500
    
    # 2. Calculate "Per-Meal" Targets (assuming 3 meals per day)
    #  Can make this more complex later (e.g., 30% for lunch)
    target_calories = daily_calories / 3
    target_protein = daily_protein / 3
    target_carbs = daily_carbs / 3
    target_fat = daily_fat / 3

    # Define a "grace period" for scoring.
    # e.g., for calories, +- 50 calories is still a "perfect" score.
    # After 50 calories (the offset), the score starts to drop.
    # The 'scale' defines how quickly it drops.
    search_body = {
        "size": 10,
        "query": {
            "function_score": {
                "query": {"match_all": {}}, # Start with all recipes
                "functions": [
                    {
                        "gauss": {
                            "calories": {
                                "origin": target_calories, # The "perfect" value
                                "offset": 50,             # Grace period
                                "scale": 100              # How quickly score drops
                            }
                        }
                    },
                    {
                        "gauss": {
                            "protein_grams": {
                                "origin": target_protein,
                                "offset": 5,
                                "scale": 10
                            }
                        }
                    },
                    {
                        "gauss": {
                            "carbs_grams": {
                                "origin": target_carbs,
                                "offset": 10,
                                "scale": 20
                            }
                        }
                    },
                    {
                        "gauss": {
                            "fat_grams": {
                                "origin": target_fat,
                                "offset": 5,
                                "scale": 10
                            }
                        }
                    }
                ],
                # We want the scores to be combined
                "score_mode": "multiply", 
                "boost_mode": "multiply"
            }
        }
    }

    # 3. Execute the search
    try:
        response = client.search(
            index=INDEX_NAME,
            body=search_body
        )
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
        if source:
            doc_id = hashlib.sha1(str(source).encode('utf-8')).hexdigest()
        else:
            doc_id = None

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
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        favs_ref = db.collection('users').document(uid).collection('favorites')
        docs = favs_ref.stream()
        favorites = []
        for doc in docs:
            item = doc.to_dict()
            item['_id'] = doc.id
            favorites.append(item)
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
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

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
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        import hashlib
        doc_id = hashlib.sha1(str(url).encode('utf-8')).hexdigest()
        doc_ref = db.collection('users').document(uid).collection('favorites').document(doc_id)
        if not doc_ref.get().exists:
            return jsonify({"error": "Favorite not found"}), 404
        doc_ref.delete()
        return jsonify({"status": "success", "message": "Favorite deleted"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete favorite by url: {e}"}), 500
    
@app.route('/calculate_macros', methods=['POST'])
def calculate_macros():
    data = request.get_json()
    uid = data.get("uid")

    # Compute macros
    macros = macros_calc(data)

    # ✅ Save to Firebase
    if uid:
        db.collection("users").document(uid).set({
            "macros": macros
        }, merge=True)

    return jsonify(macros)


@app.route('/meal-plan', methods=['POST'])
def save_meal_plan():
    """Save or overwrite user's meal plan.
    
    Expected JSON body:
    {
        "plan": {
            "Monday": {"Breakfast": recipe, "Lunch": recipe, "Dinner": recipe},
            "Tuesday": {...},
            ... (7 days total)
        }
    }
    """
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not data or 'plan' not in data:
        return jsonify({"error": "Missing 'plan' field in request body"}), 400

    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        id_token = data.get('idToken') if isinstance(data, dict) else None

    if not id_token:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        # Save/overwrite the meal plan at users/{uid}/meal_plan/current
        db.collection('users').document(uid).collection('meal_plan').document('current').set(
            {"plan": data['plan']},
            merge=True
        )
        return jsonify({"status": "success", "message": "Meal plan saved"}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to save meal plan: {e}"}), 500


@app.route('/meal-plan', methods=['GET'])
def get_meal_plan():
    """Retrieve user's saved meal plan."""
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        doc = db.collection('users').document(uid).collection('meal_plan').document('current').get()
        if not doc.exists:
            return jsonify({"error": "No meal plan found"}), 404
        return jsonify(doc.to_dict())
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve meal plan: {e}"}), 500

    try:
        favs_ref = db.collection('users').document(uid).collection('favorites')
        docs = favs_ref.stream()
        favorited_recipes = [doc.to_dict() for doc in docs]

        days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        meals_per_day = ["breakfast", "lunch", "dinner"]
        required_recipes = len(days_of_week) * len(meals_per_day)

        meal_plan = {day: {} for day in days_of_week}
        recipe_pool = list(favorited_recipes)

        if len(recipe_pool) < required_recipes and len(favorited_recipes) > 0:
            num_similar_to_find = required_recipes - len(recipe_pool)
            seed_recipe = random.choice(favorited_recipes)
            
            mlt_query = {
                "query": {
                    "more_like_this": {
                        "fields": ["name", "ingredients"],
                        "like": [
                            {
                                "_index": INDEX_NAME,
                                "doc": {
                                    "name": seed_recipe.get("name"),
                                    "ingredients": seed_recipe.get("ingredients")
                                }
                            }
                        ],
                        "min_term_freq": 1,
                        "min_doc_freq": 1
                    }
                },
                "size": num_similar_to_find
            }

            try:
                response = client.search(index=INDEX_NAME, body=mlt_query)
                similar_recipes = [hit['_source'] for hit in response['hits']['hits']]
                recipe_pool.extend(similar_recipes)
            except Exception as e:
                print(f"An error occurred during Elasticsearch search: {e}")

        random.shuffle(recipe_pool)
        recipe_iterator = iter(recipe_pool)

        for day in days_of_week:
            for meal in meals_per_day:
                try:
                    full_recipe = next(recipe_iterator)
                    meal_plan[day][meal] = format_recipe_for_display(full_recipe)
                except StopIteration:
                    meal_plan[day][meal] = None

        return jsonify({
            "user_id": uid,
            "meal_plan": meal_plan
        })

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

#helper to trim recipe info can be reused for favorties and such
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
    app.run()
