import pandas as pd
import re

def load_and_process_recipes():
    try:
        df = pd.read_csv("data/recipes.csv")
    except FileNotFoundError:
        print("ERROR: 'recipes.csv' not found")
        exit()

    def extract_nutrient(nutrition_str, nutrient_name, unit='g'):
        if not isinstance(nutrition_str, str):
            return None
        pattern = rf"{nutrient_name}\s+(\d+\.?\d*){unit}"
        match = re.search(pattern, nutrition_str, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None
    
    df['fat_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Total Fat'))
    df['saturated_fat_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Saturated Fat'))
    df['cholesterol_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Cholesterol', 'mg'))
    df['sodium_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Sodium', 'mg'))
    df['carbs_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Total Carbohydrate'))
    df['fiber_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Dietary Fiber'))
    df['sugar_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Total Sugars'))
    df['protein_grams'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Protein'))
    df['vitamin_c_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Vitamin C', 'mg'))
    df['calcium_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Calcium', 'mg'))
    df['iron_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Iron', 'mg'))
    df['potassium_mg'] = df['nutrition'].apply(lambda x: extract_nutrient(x, 'Potassium', 'mg'))
    
    df = df.rename(columns={'recipe_name': 'name'})

    # Calculate calories
    def calc_calories(row):
        try:
            fat = float(row.get('fat_grams', 0) or 0)
            carbs = float(row.get('carbs_grams', 0) or 0)
            protein = float(row.get('protein_grams', 0) or 0)
            return round(fat * 9 + carbs * 4 + protein * 4)
        except Exception:
            return ""
    df['calories'] = df.apply(calc_calories, axis=1)

    if 'Unnamed: 0' in df.columns:
        df = df.drop(columns=['Unnamed: 0'])

    df = df.fillna("")

    if 'rating' in df.columns:
        try:
            df['rating'] = df['rating'].astype(float)
        except ValueError:
            print("Warning: Couldn't convert some 'rating' values to float.")

    recipes = df.to_dict(orient='records')

    return recipes