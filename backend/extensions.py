from flask_cors import CORS

db = None
client = None
INDEX_NAME = None
auth = None

def init_extensions(app):
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:3000"],
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })

    try:
        from services import firebase as firebase_svc, elastic as elastic_svc
        global db, auth, client, INDEX_NAME
        app.db, app.auth = firebase_svc.init_firebase(app)
        app.client, app.INDEX_NAME = elastic_svc.init_elastic()
        return db, auth, client, INDEX_NAME
    except Exception as e:
        print("Warning initializing services:", e)