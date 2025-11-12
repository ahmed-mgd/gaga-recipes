import { ProfileData, Macros } from '../components/ProfileSetup';

export function calculateMacros(user: ProfileData): Macros {
  // Basal Metabolic Rate (Mifflin-St Jeor Equation)
  const bmr =
    user.gender === "male"
      ? 10 * user.weight + 6.25 * user.height - 5 * user.age + 5
      : 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;

  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  
  let calories = bmr * (activityMultipliers[user.activityLevel] || 1.2);

  // Adjust based on goal
  if (user.goal === "lose") calories -= 300;
  if (user.goal === "gain") calories += 300;

  // Macros (protein, carbs, fat)
  const protein = (calories * 0.3) / 4;
  const carbs = (calories * 0.45) / 4;
  const fat = (calories * 0.25) / 9;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}