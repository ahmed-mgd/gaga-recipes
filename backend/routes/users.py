from flask import Blueprint, jsonify, request, current_app as app
bp = Blueprint("users", __name__)

@bp.route("/<user_id>")
def get_user_demographics(user_id):
    if not app.db:
        return {"error": "Firebase not initialized"}, 500
    try:
        user_ref = app.db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            return user_doc.to_dict()
        else:
            return {"error": "User not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500
