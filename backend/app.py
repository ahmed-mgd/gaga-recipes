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


if __name__ == '__main__':
    app.run()
