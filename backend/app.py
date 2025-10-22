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
    if not query:
        return jsonify([])

    try:
        search_body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["name", "ingredients"],
                    "fuzziness": "AUTO"
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


if __name__ == '__main__':
    app.run()
