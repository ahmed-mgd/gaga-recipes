import os
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

def init_firebase(app=None):
    try:
        if not firebase_admin._apps:
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        db = firestore.client()
        auth = firebase_auth
        return db, auth
    except Exception as e:
        print("Firebase init error:", e)
        return None, None
