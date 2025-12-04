from flask import Blueprint, jsonify, request, current_app as app

bp = Blueprint("macros", __name__)

@bp.route('/calculate_macros', methods=['POST'])
def calculate_macros():
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    data = request.get_json()
    uid = data.get("uid")

    from utils.macro_calculator import macros_calc
    macros = macros_calc(data)

    if uid:
        app.db.collection("users").document(uid).set({"macros": macros}, merge=True)

    return jsonify(macros)
