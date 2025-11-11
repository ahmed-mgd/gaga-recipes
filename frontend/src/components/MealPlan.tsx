import { useState } from "react";
import { recipes as initialRecipes, recipes } from "/Users/merce/OneDrive/Desktop/OSU/F25/CSE 5914 Cpstn/Recipe/gaga-recipes/frontend/src/components/data/recipes.ts";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, ChefHat, Trash2 } from "lucide-react";

export function MealPlan() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  // base data (no database — local state only)
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedWeek, setSelectedWeek] = useState("current");

  // 🧠 Generate a random weekly plan from available recipes
  const generateWeekPlan = () => {
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    const plan: Record<string, Record<string, Recipe | null>> = {};
    let i = 0;
    for (const day of days) {
      plan[day] = {};
      for (const meal of meals) {
        plan[day][meal] = shuffled[i % shuffled.length] || null;
        i++;
      }
    }
    return plan;
  };

  const [weekPlan, setWeekPlan] = useState(generateWeekPlan());

  // 🔄 regenerate new random plan
  const regeneratePlan = () => setWeekPlan(generateWeekPlan());

  // 🗑 delete recipe from both state + plan
  const deleteRecipe = (recipeId: string) => {
    const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
    setRecipes(updatedRecipes);

    const newPlan = structuredClone(weekPlan);
    for (const day of days) {
      for (const meal of meals) {
        if (newPlan[day][meal]?.id === recipeId) newPlan[day][meal] = null;
      }
    }
    setWeekPlan(newPlan);
    setSelectedRecipe(null);
  };

  return (
    <div className="p-6">
      {/* Week Controls */}
      <div className="flex items-center justify-between mb-6">
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="current">This Week</option>
          <option value="next">Next Week</option>
          <option value="previous">Previous Week</option>
        </select>
        <Button onClick={regeneratePlan}>
          <ChefHat className="w-4 h-4 mr-2" /> Generate New Plan
        </Button>
      </div>

      {/* Meal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {days.map((day) => (
          <div key={day} className="space-y-3">
            <h3 className="text-center font-semibold p-2 bg-primary/10 rounded">{day}</h3>
            {meals.map((meal) => {
              const recipe = weekPlan[day][meal];
              return (
                <div
                  key={`${day}-${meal}`}
                  className="border rounded-lg p-2 cursor-pointer hover:shadow transition"
                  onClick={() => recipe && setSelectedRecipe(recipe)}
                >
                  {recipe ? (
                    <>
                      <ImageWithFallback
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <div className="mt-2 text-xs text-primary uppercase">{meal}</div>
                      <h4 className="text-sm font-medium line-clamp-1">{recipe.name}</h4>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{recipe.calories} cal</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {recipe.cookTime}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      No meal
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Recipe Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              {selectedRecipe?.name}
              <Button
                variant="destructive"
                size="icon"
                onClick={() => selectedRecipe && deleteRecipe(selectedRecipe.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-4">
              <ImageWithFallback
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-48 object-cover rounded"
              />
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <div>{selectedRecipe.calories} cal</div>
                <div>{selectedRecipe.protein}g P</div>
                <div>{selectedRecipe.carbs}g C</div>
                <div>{selectedRecipe.fat}g F</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRecipe.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Ingredients</h4>
                <ul className="text-sm space-y-1">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i}>• {ing}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
