from flask import Blueprint, jsonify, request, current_app as app
from utils.formatters import format_recipe_for_frontend
from services.recommendations import generate_meal_plan, get_favorite_recipes, get_fallback_recipes
from utils.dates import get_current_week_start

bp = Blueprint("meal_plan", __name__)

@bp.route("/", methods=["GET"])
def get_meal_plan():
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
        # Get current week's Monday
        current_week_start = get_current_week_start()
        
        # Check if meal plan exists in Firestore
        doc = app.db.collection('users').document(uid).collection('meal_plan').document('current').get()
        
        if doc.exists:
            plan_data = doc.to_dict()
            saved_week_start = plan_data.get('week_start')
            
            # If week_start matches current week, return existing plan
            if saved_week_start == current_week_start:
                return jsonify(plan_data)
            
            # If week_start doesn't match (new week), auto-generate new plan
            plan = generate_meal_plan(uid)
            if not plan:
                return jsonify({"error": "Failed to generate meal plan"}), 500
            
            # Save new plan with current week_start
            app.db.collection('users').document(uid).collection('meal_plan').document('current').set({
                "week_start": current_week_start,
                "plan": plan
            }, merge=False)  # Overwrite completely
            
            return jsonify({
                "week_start": current_week_start,
                "plan": plan
            })
        
        # If no plan exists, return 404 (frontend will handle)
        return jsonify({"error": "No meal plan found"}), 404
        
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve meal plan: {e}"}), 500

@bp.route("/", methods=["POST"])
def save_meal_plan():
    """
    Save an existing meal plan (for manual updates).
    """
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if 'plan' not in data:
        return jsonify({"error": "Missing 'plan' field"}), 400

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
        current_week_start = get_current_week_start()
        app.db.collection('users').document(uid).collection('meal_plan').document('current').set({
            "week_start": current_week_start,
            "plan": data['plan']
        }, merge=False)  # Overwrite completely
        return jsonify({"status": "success", "message": "Meal plan saved"}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to save meal plan: {e}"}), 500

@bp.route("/generate", methods=["POST"])
def generate_new_meal_plan():
    """
    Generate a brand new meal plan and save it.
    Called when user clicks "Generate New Plan" button.
    """
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
        # Generate new plan
        plan = generate_meal_plan(uid)
        if not plan:
            return jsonify({"error": "Failed to generate meal plan"}), 500
        
        # Get current week's Monday
        current_week_start = get_current_week_start()
        
        # Save with current week_start (overwrite existing)
        app.db.collection('users').document(uid).collection('meal_plan').document('current').set({
            "week_start": current_week_start,
            "plan": plan
        }, merge=False)  # Overwrite completely
        
        return jsonify({
            "week_start": current_week_start,
            "plan": plan
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to generate meal plan: {e}"}), 500

@bp.route("/add", methods=["POST"])
def add_recipe_to_plan():
    """
    Add or replace a recipe in the user's saved meal plan.
    Expects JSON body:
      { "day": "Monday", "meal": "Lunch", "recipe": { ... }, "idToken": "<optional>" }
    Returns the updated plan document.
    """
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not payload:
        return jsonify({"error": "Missing request body"}), 400

    day = payload.get("day")
    meal = payload.get("meal")
    recipe_payload = payload.get("recipe")
    if not day or not meal or not recipe_payload:
        return jsonify({"error": "Fields 'day', 'meal', and 'recipe' are required"}), 400

    # auth token from header or body
    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        id_token = payload.get('idToken') if isinstance(payload, dict) else None

    if not id_token:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
        if not uid:
            return jsonify({"error": "Could not identify user from token"}), 401
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        doc_ref = app.db.collection('users').document(uid).collection('meal_plan').document('current')
        doc = doc_ref.get()

        if doc.exists:
            doc_data = doc.to_dict() or {}
            plan = doc_data.get('plan', {}) if isinstance(doc_data.get('plan', {}), dict) else {}
            week_start = doc_data.get('week_start') or get_current_week_start()
        else:
            # Initialize empty plan structure for the week
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            meals = ["Breakfast", "Lunch", "Dinner"]
            plan = {d: {m: None for m in meals} for d in days}
            week_start = get_current_week_start()

        # Normalize day and meal keys (use canonical names if present)
        days_list = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        meals_list = ["Breakfast", "Lunch", "Dinner"]

        day_key = next((d for d in plan.keys() if str(d).strip().lower() == str(day).strip().lower()), None)
        if day_key is None:
            day_key = next((d for d in days_list if d.lower() == str(day).strip().lower()), str(day).strip().title())
            if day_key not in plan:
                plan[day_key] = {m: None for m in meals_list}

        day_block = plan.get(day_key)
        if not isinstance(day_block, dict):
            # Reset to expected day structure if malformed
            day_block = {m: None for m in meals_list}
            plan[day_key] = day_block

        meal_key = next((m for m in day_block.keys() if str(m).strip().lower() == str(meal).strip().lower()), None)
        if meal_key is None:
            meal_key = next((m for m in meals_list if m.lower() == str(meal).strip().lower()), str(meal).strip().title())

        # Normalize the incoming recipe into frontend shape using existing helper
        formatted = format_recipe_for_frontend(recipe_payload, recipe_id=recipe_payload.get("id") if isinstance(recipe_payload, dict) else None)
        if not formatted:
            return jsonify({"error": "Provided recipe could not be formatted"}), 400

        # Set/replace the meal slot
        day_block[meal_key] = formatted
        plan[day_key] = day_block

        # Persist updated plan (preserve week_start)
        doc_ref.set({"week_start": week_start, "plan": plan}, merge=False)

        return jsonify({"status": "success", "plan": {"week_start": week_start, "plan": plan}}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to add recipe to plan: {e}"}), 500

@bp.route("/delete", methods=["POST"])
def delete_meal_from_plan():
    """
    Delete a meal from the saved meal plan.
    Expects JSON body: { "day": "Monday", "meal": "Lunch", "idToken": "<optional if using Authorization header>" }
    Returns the updated plan document.
    """
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not payload:
        return jsonify({"error": "Missing request body"}), 400

    day = payload.get("day")
    meal = payload.get("meal")
    if not day or not meal:
        return jsonify({"error": "Both 'day' and 'meal' fields are required"}), 400

    # auth token from header or body
    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        id_token = payload.get('idToken') if isinstance(payload, dict) else None

    if not id_token:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
        if not uid:
            return jsonify({"error": "Could not identify user from token"}), 401
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        doc_ref = app.db.collection('users').document(uid).collection('meal_plan').document('current')
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "No saved meal plan for user"}), 404

        doc_data = doc.to_dict() or {}
        plan = doc_data.get('plan', {})
        if not isinstance(plan, dict):
            return jsonify({"error": "Saved plan has unexpected format"}), 500

        # find case-insensitive day key
        day_key = next((k for k in plan.keys() if str(k).strip().lower() == str(day).strip().lower()), None)
        if day_key is None:
            return jsonify({"error": f"Day '{day}' not found in saved plan"}), 400

        day_block = plan.get(day_key) or {}
        if not isinstance(day_block, dict):
            return jsonify({"error": f"Plan for day '{day_key}' has unexpected format"}), 500

        # find case-insensitive meal key
        meal_key = next((k for k in day_block.keys() if str(k).strip().lower() == str(meal).strip().lower()), None)
        if meal_key is None:
            return jsonify({"error": f"Meal '{meal}' not found for day '{day_key}'"}), 400

        # set the meal slot to None (delete)
        day_block[meal_key] = None
        plan[day_key] = day_block

        # Preserve existing week_start if present
        week_start = doc_data.get('week_start')

        # persist updated plan (overwrite plan field)
        if week_start:
            doc_ref.set({"week_start": week_start, "plan": plan}, merge=False)
        else:
            doc_ref.set({"plan": plan}, merge=True)

        return jsonify({"status": "success", "plan": {"week_start": week_start, "plan": plan}}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete meal from plan: {e}"}), 500

@bp.route("/replacements", methods=["POST"])
def suggest_recipes_for_slot():
    """
    Suggest 3 recipes to replace a single meal slot for the authenticated user.
    Request JSON:
      {
        "day": "Monday",
        "meal": "Lunch",
      }
    """
    if not app.db:
        return jsonify({"error": "Firebase not initialized"}), 500

    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not payload:
        return jsonify({"error": "Missing request body"}), 400

    day = payload.get("day")
    meal = payload.get("meal")
    if not day or not meal:
        return jsonify({"error": "Both 'day' and 'meal' fields are required"}), 400

    # auth token from header or body
    auth_header = request.headers.get('Authorization', '')
    id_token = None
    if auth_header.startswith('Bearer '):
        id_token = auth_header.split(' ', 1)[1]
    else:
        id_token = payload.get('idToken') if isinstance(payload, dict) else None

    if not id_token:
        return jsonify({"error": "Missing Authorization token"}), 401

    try:
        decoded = app.auth.verify_id_token(id_token)
        uid = decoded.get('uid') or decoded.get('sub')
        if not uid:
            return jsonify({"error": "Could not identify user from token"}), 401
    except Exception as e:
        return jsonify({"error": f"Invalid auth token: {e}"}), 401

    try:
        # Load saved plan if present to determine currently used recipe ids for that day
        doc_ref = app.db.collection('users').document(uid).collection('meal_plan').document('current')
        doc = doc_ref.get()
        used_ids = set()
        day_block = {}
        if doc.exists:
            doc_data = doc.to_dict() or {}
            plan = doc_data.get('plan', {}) if isinstance(doc_data.get('plan', {}), dict) else {}
            # find canonical day key (case-insensitive)
            day_key = next((k for k in plan.keys() if str(k).strip().lower() == str(day).strip().lower()), None)
            if day_key:
                day_block = plan.get(day_key) or {}
                # Collect ids used in that day (so we don't suggest duplicates)
                for _, r in (day_block.items() if isinstance(day_block, dict) else []):
                    try:
                        if isinstance(r, dict) and r.get("id"):
                            used_ids.add(r.get("id"))
                    except Exception:
                        continue

        # Also consider favorites we should prioritize
        favorites = get_favorite_recipes(uid) if app.db else []
        suggestions = []
        seen = set()

        # Pick favorites first (exclude those already used in the day)
        for fav in favorites:
            if not fav:
                continue
            fid = fav.get("id")
            if not fid or fid in used_ids or fid in seen:
                continue
            suggestions.append(fav)
            seen.add(fid)
            if len(suggestions) >= 3:
                break

        # If not enough, fill using fallback recipes (Elasticsearch) respecting user's macros
        if len(suggestions) < 3:
            # get user macros if present
            user_doc = app.db.collection('users').document(uid).get()
            macros = {}
            if user_doc.exists:
                user_data = user_doc.to_dict() or {}
                macros = user_data.get('macros', {}) if isinstance(user_data.get('macros', {}), dict) else {}

            # Exclude favorites already selected and used ids
            exclude_ids = set(used_ids) | seen

            needed = 3 - len(suggestions)
            fallbacks = get_fallback_recipes(macros, needed, exclude_ids=exclude_ids)
            for fb in fallbacks:
                if not fb:
                    continue
                fid = fb.get("id")
                if fid and fid in seen:
                    continue
                suggestions.append(fb)
                if fid:
                    seen.add(fid)
                if len(suggestions) >= 3:
                    break

        return jsonify({"status": "success", "suggestions": suggestions}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to compute suggestions: {e}"}), 500

