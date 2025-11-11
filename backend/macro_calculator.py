def calculate_macros(user):
    age = user.get("age")
    gender = user.get("gender")
    height = user.get("height")
    weight = user.get("weight")
    activity_level = user.get("activityLevel")
    goal = user.get("goal")

    # BMR using Mifflin-St Jeor formula
    if gender.lower() == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    # Activity multiplier
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
    }
    calories = bmr * multipliers.get(activity_level, 1.2)

    # Goal adjustment
    if goal == "lose":
        calories -= 300
    elif goal == "gain":
        calories += 300

    protein = (calories * 0.3) / 4
    carbs = (calories * 0.45) / 4
    fat = (calories * 0.25) / 9

    return {
        "calories": round(calories),
        "protein": round(protein),
        "carbs": round(carbs),
        "fat": round(fat),
    }
