import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, ChefHat, Trash2 } from "lucide-react";
import { recipes } from "./data/recipes"; // your master recipe list

interface Recipe {
  id: string;
  name: string;
  image: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cookTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

export function MealPlan() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState(() => generateRandomMealPlan());
  const [selectedWeek, setSelectedWeek] = useState("current");

  // 🔄 Function to generate a random plan
  function generateRandomMealPlan() {
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    let index = 0;
    const plan: Record<string, Record<string, Recipe>> = {};

    for (const day of days) {
      plan[day] = {};
      for (const meal of meals) {
        plan[day][meal] = shuffled[index % shuffled.length];
        index++;
      }
    }
    return plan;
  }

  // 🗑️ Delete/replace logic
  const handleDeleteRecipe = (day: string, meal: string) => {
    setMealPlan((prev) => {
      // Get all recipes currently in use
      const usedRecipeIds = new Set(
        Object.values(prev)
          .flatMap((meals) => Object.values(meals))
          .map((r) => r.id)
      );

      // Find unused recipes
      const unusedRecipes = recipes.filter((r) => !usedRecipeIds.has(r.id));

      // If none unused, reset to full list (so we repeat)
      const pool = unusedRecipes.length > 0 ? unusedRecipes : recipes;

      // Choose a random new recipe
      const replacement = pool[Math.floor(Math.random() * pool.length)];

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: replacement,
        },
      };
    });
  };

  const openRecipeDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const regeneratePlan = () => {
    setMealPlan(generateRandomMealPlan());
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
          >
            <option value="current">This Week</option>
            <option value="next">Next Week</option>
            <option value="previous">Previous Week</option>
          </select>

          <Button onClick={regeneratePlan}>
            <ChefHat className="h-4 w-4 mr-2" />
            Generate New Plan
          </Button>
        </div>

        {/* Meal Plan Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day} className="space-y-4">
              <h3 className="text-center p-3 bg-primary/10 rounded-lg border">{day}</h3>
              {meals.map((meal) => {
                const recipe = mealPlan[day][meal];
                return (
                  <Card
                    key={`${day}-${meal}`}
                    className="hover:shadow-md transition-shadow relative"
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs text-primary uppercase tracking-wide">
                        {meal}
                        <Trash2
                          className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleDeleteRecipe(day, meal)}
                        />
                      </div>
                      <div
                        onClick={() => openRecipeDialog(recipe)}
                        className="cursor-pointer"
                      >
                        <ImageWithFallback
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <h4 className="text-sm line-clamp-2">{recipe.name}</h4>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{recipe.calories} cal</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.cookTime}
                          </span>
                        </div>
                        {/* <div className="flex flex-wrap gap-1 mt-1">
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0.5 whitespace-nowrap flex-shrink-0"
                          >
                            P: {recipe.protein}g
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0.5 whitespace-nowrap flex-shrink-0"
                          >
                            C: {recipe.carbs}g
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0.5 whitespace-nowrap flex-shrink-0"
                          >
                            F: {recipe.fat}g
                          </Badge>
                        </div> */}


                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Details Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecipe?.name}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {selectedRecipe?.servings} servings
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-6">
              <ImageWithFallback
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-48 object-cover rounded-lg"
              />

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.protein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.carbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.fat}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRecipe.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="mb-3">Ingredients</h4>
                  <ul className="space-y-2 text-sm">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-3">Instructions</h4>
                  <ol className="space-y-2 text-sm">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
