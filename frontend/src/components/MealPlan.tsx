import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, ChefHat } from "lucide-react";

interface MealPlanProps {}

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

export function MealPlan({}: MealPlanProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedWeek, setSelectedWeek] = useState("current");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  // Sample meal plan data
  const mealPlan = {
    "Monday": {
      "Breakfast": {
        id: "1",
        name: "Greek Yogurt Parfait",
        image: "https://images.unsplash.com/photo-1631006469985-da8976132e24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NTgwNjA2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        calories: 320,
        protein: 20,
        carbs: 35,
        fat: 8,
        cookTime: "5 min",
        servings: 1,
        ingredients: [
          "1 cup Greek yogurt",
          "1/2 cup mixed berries",
          "2 tbsp granola",
          "1 tbsp honey",
          "1 tbsp chia seeds"
        ],
        instructions: [
          "Layer Greek yogurt in a glass or bowl",
          "Add a layer of mixed berries",
          "Sprinkle granola on top",
          "Drizzle with honey",
          "Top with chia seeds"
        ],
        tags: ["Quick", "Protein-rich", "Vegetarian"]
      },
      "Lunch": {
        id: "2",
        name: "Quinoa Buddha Bowl",
        image: "https://images.unsplash.com/photo-1631006469985-da8976132e24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NTgwNjA2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        calories: 450,
        protein: 18,
        carbs: 55,
        fat: 15,
        cookTime: "25 min",
        servings: 2,
        ingredients: [
          "1 cup cooked quinoa",
          "1 cup roasted vegetables",
          "1/4 avocado",
          "2 tbsp tahini dressing",
          "Mixed greens"
        ],
        instructions: [
          "Cook quinoa according to package directions",
          "Roast mixed vegetables until tender",
          "Arrange quinoa and vegetables in bowl",
          "Top with avocado slices",
          "Drizzle with tahini dressing"
        ],
        tags: ["Vegan", "High-fiber", "Nutrient-dense"]
      },
      "Dinner": {
        id: "3",
        name: "Grilled Salmon & Vegetables",
        image: "https://images.unsplash.com/photo-1631006469985-da8976132e24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHByZXAlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NTgwNjA2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        calories: 520,
        protein: 35,
        carbs: 20,
        fat: 25,
        cookTime: "20 min",
        servings: 2,
        ingredients: [
          "2 salmon fillets",
          "2 cups mixed vegetables",
          "2 tbsp olive oil",
          "Lemon juice",
          "Herbs and spices"
        ],
        instructions: [
          "Preheat grill to medium-high heat",
          "Season salmon with herbs and spices",
          "Toss vegetables with olive oil",
          "Grill salmon 4-5 minutes per side",
          "Grill vegetables until tender"
        ],
        tags: ["High-protein", "Omega-3", "Low-carb"]
      }
    }
    // For demo, we'll repeat Monday's meals for other days
  };

  // Fill out the week with similar data
  const weekMealPlan = days.reduce((plan, day) => {
    plan[day] = mealPlan["Monday"];
    return plan;
  }, {} as any);

  const openRecipeDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  return (
    <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <select 
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="current">This Week</option>
                <option value="next">Next Week</option>
                <option value="previous">Previous Week</option>
              </select>
            </div>
            <Button>
              <ChefHat className="h-4 w-4 mr-2" />
              Generate New Plan
            </Button>
          </div>

          {/* Meal Plan Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {days.map((day) => (
              <div key={day} className="space-y-4">
                <h3 className="text-center p-3 bg-primary/10 rounded-lg border">
                  {day}
                </h3>
                {meals.map((meal) => {
                  const recipe = weekMealPlan[day]?.[meal];
                  return (
                    <Card 
                      key={`${day}-${meal}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => recipe && openRecipeDialog(recipe)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="text-xs text-primary uppercase tracking-wide">
                            {meal}
                          </div>
                          {recipe ? (
                            <>
                              <ImageWithFallback
                                src={recipe.image}
                                alt={recipe.name}
                                className="w-full h-24 object-cover rounded-md"
                              />
                              <h4 className="text-sm line-clamp-2">
                                {recipe.name}
                              </h4>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{recipe.calories} cal</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {recipe.cookTime}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  P: {recipe.protein}g
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  C: {recipe.carbs}g
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  F: {recipe.fat}g
                                </Badge>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No meal planned
                            </div>
                          )}
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
                  <Badge key={tag} variant="outline">{tag}</Badge>
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