def format_recipe_for_display(full_recipe):
    if not full_recipe:
        return None
    
    return {
        "name": full_recipe.get("name"),
        "url": full_recipe.get("url"),
        "img_src": full_recipe.get("img_src"),
        "prep_time": full_recipe.get("prep_time"),
        "total_time": full_recipe.get("total_time"),
        "calories": full_recipe.get("calories"),
        "protein_grams": full_recipe.get("protein_grams"),
        "fat_grams": full_recipe.get("fat_grams"),
        "carbs_grams": full_recipe.get("carbs_grams"),
    }


def format_recipe_for_frontend(full_recipe, recipe_id=None):
    """
    Transform ES/Firebase recipe into frontend shape.
    """
    if not full_recipe:
        return None
    
    import hashlib
    import re
    
    # Generate ID if not provided
    if not recipe_id:
        source = full_recipe.get("url") or full_recipe.get("name") or ""
        recipe_id = hashlib.sha1(str(source).encode('utf-8')).hexdigest() if source else ""
    
    # Split ingredients by comma, newline, or semicolon
    ingredients_str = full_recipe.get("ingredients", "")
    if isinstance(ingredients_str, list):
        ingredients = ingredients_str
    elif isinstance(ingredients_str, str):
        ingredients = [ing.strip() for ing in re.split(r'[,;\n\r]+', ingredients_str) if ing.strip()]
    else:
        ingredients = []
    
    # Split directions/instructions by period, newline, or numbered list
    directions_str = full_recipe.get("directions", "") or full_recipe.get("instructions", "")
    if isinstance(directions_str, list):
        instructions = directions_str
    elif isinstance(directions_str, str):
        # Try splitting by newlines first (most common format)
        instructions = [inst.strip() for inst in re.split(r'[\n\r]+', directions_str) if inst.strip()]
        # If that didn't work well, try splitting by periods
        if len(instructions) <= 1:
            instructions = [inst.strip() for inst in re.split(r'\.\s+', directions_str) if inst.strip()]
        # If still not working, try numbered list pattern
        if len(instructions) <= 1:
            instructions = [inst.strip() for inst in re.split(r'(?=\d+\.\s)', directions_str) if inst.strip()]
    else:
        instructions = []
    
    return {
        "id": recipe_id,
        "name": full_recipe.get("name", ""),
        "image": full_recipe.get("img_src") or full_recipe.get("image") or full_recipe.get("image_url") or "",
        "calories": float(full_recipe.get("calories", 0)) if full_recipe.get("calories") else 0,
        "protein": float(full_recipe.get("protein_grams", 0)) if full_recipe.get("protein_grams") else 0,
        "carbs": float(full_recipe.get("carbs_grams", 0)) if full_recipe.get("carbs_grams") else 0,
        "fat": float(full_recipe.get("fat_grams", 0)) if full_recipe.get("fat_grams") else 0,
        "cookTime": full_recipe.get("cook_time") or full_recipe.get("total_time") or full_recipe.get("prep_time") or "",
        "servings": int(full_recipe.get("servings") or full_recipe.get("yield") or 1) if full_recipe.get("servings") or full_recipe.get("yield") else 1,
        "ingredients": ingredients,
        "instructions": instructions,
        "tags": []
    }
