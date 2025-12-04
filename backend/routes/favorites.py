from flask import Blueprint, jsonify, request, current_app as app
bp = Blueprint("favorites", __name__)

@bp.route("/", methods=["GET"])
def list_favorites():
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        docs = app.db.collection('users').document(uid).collection('favorites').stream()
        favorites = [{**doc.to_dict(), "_id": doc.id} for doc in docs]
        return jsonify(favorites)
    except Exception as e:
        return jsonify({"error": f"Failed to list favorites: {e}"}), 500

# FIXME: Originally /add_recipe
@bp.route("/add_recipe", methods=["POST"])
def add_recipe():
    if not app.db:
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
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        source = recipe.get('url') or recipe.get('recipe_name') or recipe.get('name')
        import hashlib
        doc_id = hashlib.sha1(str(source).encode('utf-8')).hexdigest() if source else None

        favs = app.db.collection('users').document(uid).collection('favorites')
        data_to_save = dict(recipe)
        data_to_save.pop('idToken', None)

        if doc_id:
            favs.document(doc_id).set(data_to_save, merge=True)
        else:
            favs.add(data_to_save)

    except Exception as e:
        return jsonify({"error": f"Failed to save recipe: {e}"}), 500

    return jsonify({"status": "success", "message": "Favorite added"}), 201

@bp.route("/<fav_id>", methods=["DELETE"])
def delete_favorite_by_id(fav_id):
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        doc_ref = app.db.collection('users').document(uid).collection('favorites').document(fav_id)
        if not doc_ref.get().exists:
            return jsonify({"error": "Favorite not found"}), 404
        doc_ref.delete()
        return jsonify({"status": "success", "message": "Favorite deleted"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete favorite: {e}"}), 500

@bp.route('/', methods=['DELETE'])
def delete_favorite_by_url():
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    url = request.args.get('url')
    if not url:
        return jsonify({"error": "Missing url query parameter"}), 400

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Missing Authorization token"}), 401
    id_token = auth_header.split(' ', 1)[1]

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
    except Exception:
        return jsonify({"error": "Invalid auth token"}), 401

    try:
        import hashlib
        doc_id = hashlib.sha1(url.encode("utf-8")).hexdigest()
        doc_ref = app.db.collection('users').document(uid).collection('favorites').document(doc_id)

        if not doc_ref.get().exists:
            return jsonify({"error": "Favorite not found"}), 404

        doc_ref.delete()
        return jsonify({"status": "success", "message": "Favorite deleted"}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete favorite by url: {e}"}), 500
