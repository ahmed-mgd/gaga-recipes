from flask import current_app as app
from utils.formatters import format_recipe_for_frontend

def get_favorite_recipes(uid):
    """
    Pull favorites from Firestore under /users/{uid}/favorites/*
    Returns list of formatted recipes for frontend.
    """
    if not app.db:
        return []
    
    try:
        favs_ref = app.db.collection('users').document(uid).collection('favorites')
        docs = favs_ref.stream()
        favorites = []
        for doc in docs:
            recipe_data = doc.to_dict()
            formatted = format_recipe_for_frontend(recipe_data, recipe_id=doc.id)
            if formatted:
                favorites.append(formatted)
        return favorites
    except Exception as e:
        print(f"Error fetching favorites: {e}")
        return []


def get_fallback_recipes(macros, count_needed, exclude_ids=None):
    """
    Get recipes from Elasticsearch that match user macros.
    Avoid duplicates by excluding recipe IDs in exclude_ids.
    """
    if not app.client or not app.INDEX_NAME:
        return []
    
    if exclude_ids is None:
        exclude_ids = set()
    else:
        exclude_ids = set(exclude_ids)
    
    try:
        daily_calories = float(macros.get('calories', 2000))
        daily_protein = float(macros.get('protein', 50))
        daily_carbs = float(macros.get('carbs', 300))
        daily_fat = float(macros.get('fat', 70))
        
        # Per-meal targets (assuming 3 meals per day)
        target_calories = daily_calories / 3
        target_protein = daily_protein / 3
        target_carbs = daily_carbs / 3
        target_fat = daily_fat / 3
        
        # Fetch more than needed to account for duplicates
        fetch_size = min(count_needed * 3, 100)
        
        search_body = {
            "size": fetch_size,
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
        
        response = app.client.search(index=app.INDEX_NAME, body=search_body)
        results = []
        seen_ids = set(exclude_ids)
        
        for hit in response['hits']['hits']:
            recipe = hit['_source']
            import hashlib
            source = recipe.get("url") or recipe.get("name") or ""
            recipe_id = hashlib.sha1(str(source).encode('utf-8')).hexdigest() if source else ""
            
            # Skip if already seen
            if recipe_id in seen_ids:
                continue
            
            formatted = format_recipe_for_frontend(recipe, recipe_id=recipe_id)
            if formatted:
                results.append(formatted)
                seen_ids.add(recipe_id)
                
                if len(results) >= count_needed:
                    break
        
        return results
    except Exception as e:
        print(f"Error fetching fallback recipes: {e}")
        return []

def generate_meal_plan(uid):
    """
    Generate a meal plan using favorites first, then fallback recipes.
    Returns plan in frontend format: { "Monday": { "Breakfast": Recipe, ... }, ... }
    """
    if not app.db:
        return None
    
    try:
        # Get user macros
        user_ref = app.db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return None
        
        user_data = user_doc.to_dict()
        macros = user_data.get('macros', {})
        
        # Get favorites
        favorites = get_favorite_recipes(uid)
        
        # Collect all available recipes
        all_recipes = []
        used_ids = set()
        
        # Add favorites first
        for fav in favorites:
            if fav and fav.get("id"):
                all_recipes.append(fav)
                used_ids.add(fav["id"])
        
        # Get fallback recipes if needed (21 meals = 7 days × 3 meals)
        needed = 21 - len(all_recipes)
        if needed > 0:
            fallbacks = get_fallback_recipes(macros, needed, exclude_ids=used_ids)
            for fb in fallbacks:
                if fb and fb.get("id") and fb["id"] not in used_ids:
                    all_recipes.append(fb)
                    used_ids.add(fb["id"])
        
        # If still not enough, repeat some (unavoidable case)
        import random
        if len(all_recipes) < 21:
            while len(all_recipes) < 21:
                all_recipes.append(random.choice(all_recipes))
        
        # Shuffle for random distribution
        random.shuffle(all_recipes)
        
        # Build meal plan structure
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        meals = ["Breakfast", "Lunch", "Dinner"]
        
        plan = {}
        recipe_index = 0
        
        for day in days:
            plan[day] = {}
            for meal in meals:
                if recipe_index < len(all_recipes):
                    plan[day][meal] = all_recipes[recipe_index]
                    recipe_index += 1
                else:
                    # Fallback if somehow we don't have enough
                    plan[day][meal] = all_recipes[recipe_index % len(all_recipes)]
                    recipe_index += 1
        
        return plan
    except Exception as e:
        print(f"Error generating meal plan: {e}")
        return None
