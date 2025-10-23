# backend/app.py
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from elastic import client, INDEX_NAME

# Configuration
DEBUG = True

# Instantiate the app
app = Flask(__name__)
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
CORS(app, resources={r'/api/*': {'origins': '*'}})

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
        daily_carbs = float(macros.get('carbohydrates', 300))
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

if __name__ == '__main__':
    app.run()
