# backend/app.py

from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

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

if __name__ == '__main__':
    app.run()
