from flask import Blueprint, jsonify, request, current_app as app
bp = Blueprint("search", __name__)

@bp.route("/search")
def search_recipes():
    if not app.client:
        return jsonify({"error": "Elasticsearch not initialized"}), 500
    
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
            filters.append({"range": {"protein_grams": protein}})

        calories_range = {}
        if min_calories is not None:
            calories_range['gte'] = min_calories
        if max_calories is not None:
            calories_range['lte'] = max_calories
        if calories_range:
            filters.append({"range": {"calories": calories_range}})

        search_body = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "filter": filters
                }
            }
        }

        response = app.client.search(index=app.INDEX_NAME, body=search_body)
        results = [hit['_source'] for hit in response['hits']['hits']]
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"An error occurred during search: {e}"}), 500

@bp.route("/recommendations/<user_id>")
def get_recommendations(user_id):
    if not app.db or not app.client:
        return jsonify({"error": "Services not initialized"}), 500

    try:
        user_ref = app.db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = user_doc.to_dict()
        macros = user_data.get('macros')

        if not macros:
            return jsonify({"error": "User has no macro data"}), 404

        daily_calories = float(macros.get('calories', 2000))
        daily_protein = float(macros.get('protein', 50))
        daily_carbs = float(macros.get('carbs', 300))
        daily_fat = float(macros.get('fat', 70))

    except Exception as e:
        return jsonify({"error": f"Firebase error: {str(e)}"}), 500

    target_calories = daily_calories / 3
    target_protein = daily_protein / 3
    target_carbs = daily_carbs / 3
    target_fat = daily_fat / 3

    search_body = {
        "size": 10,
        "query": {
            "function_score": {
                "query": {"match_all": {}},
                "functions": [
                    {"gauss": {"calories": {"origin": target_calories, "offset": 50, "scale": 100}}},
                    {"gauss": {"protein_grams": {"origin": target_protein, "offset": 5, "scale": 10}}},
                    {"gauss": {"carbs_grams": {"origin": target_carbs, "offset": 10, "scale": 20}}},
                    {"gauss": {"fat_grams": {"origin": target_fat, "offset": 5, "scale": 10}}},
                ],
                "score_mode": "multiply",
                "boost_mode": "multiply"
            }
        }
    }

    try:
        response = app.client.search(index=app.INDEX_NAME, body=search_body)
        results = [hit['_source'] for hit in response['hits']['hits']]
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"An error occurred during search: {e}"}), 500
