import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { recipes } from "./data/recipes";   // 👍 keep THIS and only this
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, ChefHat, Trash2 } from "lucide-react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

interface BackendRecipe {
  id?: string;
  _id?: string;
  name?: string;
  img_src?: string;
  image?: string;
  image_url?: string;
  calories?: number;
  protein_grams?: number;
  protein?: number;
  carbs_grams?: number;
  carbs?: number;
  fat_grams?: number;
  fat?: number;
  cook_time?: string;
  total_time?: string;
  prep_time?: string;
  servings?: string | number;
  yield?: string | number;
  ingredients?: string[] | string;
  directions?: string[] | string;
  instructions?: string[] | string;
  tags?: string[];
  url?: string;
  [key: string]: any;
}

export function MealPlan() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<Record<string, Record<string, Recipe>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState("current");

  // Transform backend recipe to frontend format
  function transformRecipe(backendRecipe: BackendRecipe): Recipe | null {
    if (!backendRecipe || !backendRecipe.name) return null;

    // Generate ID
    const id = backendRecipe.id || backendRecipe._id || 
      (backendRecipe.url || backendRecipe.name || "").replace(/\s+/g, "-").toLowerCase();

    // Parse ingredients
    let ingredients: string[] = [];
    if (Array.isArray(backendRecipe.ingredients)) {
      ingredients = backendRecipe.ingredients;
    } else if (typeof backendRecipe.ingredients === "string") {
      ingredients = backendRecipe.ingredients
        .split(/[,;\n\r]+/)
        .map((ing: string) => ing.trim())
        .filter((ing: string) => ing.length > 0);
    }

    // Parse instructions
    let instructions: string[] = [];
    const directionsStr = backendRecipe.directions || backendRecipe.instructions || "";
    if (Array.isArray(directionsStr)) {
      instructions = directionsStr;
    } else if (typeof directionsStr === "string") {
      // Try splitting by newlines first
      instructions = directionsStr
        .split(/[\n\r]+/)
        .map((inst: string) => inst.trim())
        .filter((inst: string) => inst.length > 0);
      
      // If that didn't work, try periods
      if (instructions.length <= 1) {
        instructions = directionsStr
          .split(/\.\s+/)
          .map((inst: string) => inst.trim())
          .filter((inst: string) => inst.length > 0);
      }
    }

    const calories = backendRecipe.calories !== undefined ? Number(backendRecipe.calories) : 0;
    const protein = backendRecipe.protein_grams !== undefined ? Number(backendRecipe.protein_grams) : 
                   (backendRecipe.protein !== undefined ? Number(backendRecipe.protein) : 0);
    const carbs = backendRecipe.carbs_grams !== undefined ? Number(backendRecipe.carbs_grams) : 
                  (backendRecipe.carbs !== undefined ? Number(backendRecipe.carbs) : 0);
    const fat = backendRecipe.fat_grams !== undefined ? Number(backendRecipe.fat_grams) : 
                (backendRecipe.fat !== undefined ? Number(backendRecipe.fat) : 0);
    
    return {
      id,
      name: backendRecipe.name || "",
      image: backendRecipe.img_src || backendRecipe.image || backendRecipe.image_url || "",
      calories: isNaN(calories) ? 0 : calories,
      protein: isNaN(protein) ? 0 : protein,
      carbs: isNaN(carbs) ? 0 : carbs,
      fat: isNaN(fat) ? 0 : fat,
      cookTime: backendRecipe.cook_time || backendRecipe.total_time || backendRecipe.prep_time || "",
      servings: Number(backendRecipe.servings || backendRecipe.yield || 1) || 1,
      ingredients,
      instructions,
      tags: Array.isArray(backendRecipe.tags) ? backendRecipe.tags : [],
    };
  }

  // Fisher-Yates shuffle algorithm
  function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate personalized meal plan
  async function generatePersonalizedMealPlan(uid: string): Promise<Record<string, Record<string, Recipe>>> {
    const plan: Record<string, Record<string, Recipe>> = {};
    
    // Initialize empty plan structure with fallback recipe
    const fallbackRecipe: Recipe = recipes[0] || {
      id: "fallback",
      name: "Recipe",
      image: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      cookTime: "",
      servings: 1,
      ingredients: [],
      instructions: [],
      tags: [],
    };
    
    for (const day of days) {
      plan[day] = {};
      for (const meal of meals) {
        plan[day][meal] = fallbackRecipe; // Temporary placeholder
      }
    }

    try {
      // 1. Fetch all favorite recipes
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        return generateRandomMealPlan();
      }

      const favoritesRes = await fetch("http://localhost:5000/favorites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let favorites: Recipe[] = [];
      if (favoritesRes.ok) {
        const favoritesData: BackendRecipe[] = await favoritesRes.json();
        favorites = favoritesData
          .map(transformRecipe)
          .filter((r): r is Recipe => r !== null);
      }

      // 2. Shuffle favorites
      favorites = fisherYatesShuffle(favorites);

      // 3. Compute remaining slots
      const remaining = 21 - favorites.length;

      // 4. Fetch fallback recommendations from backend
      let fallbacks: Recipe[] = [];
      if (remaining > 0) {
        try {
          const recommendationsRes = await fetch(`http://localhost:5000/api/recommendations/${uid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (recommendationsRes.ok) {
            const recommendationsData: BackendRecipe[] = await recommendationsRes.json();
            const transformed = recommendationsData
              .map(transformRecipe)
              .filter((r): r is Recipe => r !== null);

            // 5. Remove fallback recipes that overlap with favorites
            const favoriteIds = new Set(favorites.map((f) => f.id));
            fallbacks = transformed.filter((r) => !favoriteIds.has(r.id));
          }
        } catch (err) {
          console.error("Failed to fetch recommendations", err);
        }
      }

      // 6. Shuffle fallback list
      fallbacks = fisherYatesShuffle(fallbacks);

      // 7. Construct the available pool
      let planPool: Recipe[] = [...favorites, ...fallbacks];

      // 8. If planPool.length < 21, use local recipes as fallback-fallback
      if (planPool.length < 21) {
        const usedIds = new Set(planPool.map((r) => r.id));
        const localFallbacks = recipes.filter((r) => !usedIds.has(r.id));
        planPool = [...planPool, ...localFallbacks];
        
        // If still not enough, allow repeats only after exhausting all unique recipes
        if (planPool.length < 21) {
          const uniqueRecipes = [...planPool];
          while (planPool.length < 21) {
            planPool.push(...uniqueRecipes);
          }
          planPool = planPool.slice(0, 21);
        }
      }

      // 9. Create 21-item meal list using Fisher-Yates shuffle
      // Ensure no duplicates until it's impossible to avoid
      const mealList: Recipe[] = [];
      const usedIds = new Set<string>();
      const shuffledPool = fisherYatesShuffle(planPool);

      for (const recipe of shuffledPool) {
        if (mealList.length >= 21) break;
        
        // Try to avoid duplicates
        if (!usedIds.has(recipe.id) || mealList.length >= planPool.length) {
          mealList.push(recipe);
          usedIds.add(recipe.id);
        }
      }

      // Fill remaining slots if needed (unavoidable duplicates)
      while (mealList.length < 21) {
        const randomRecipe = shuffledPool[Math.floor(Math.random() * shuffledPool.length)];
        mealList.push(randomRecipe);
      }

      // Final shuffle of the meal list
      const finalMealList = fisherYatesShuffle(mealList.slice(0, 21));

      // 10. Map the 21 items to the weekly grid
      let mealIndex = 0;
      for (const day of days) {
        for (const meal of meals) {
          if (mealIndex < finalMealList.length) {
            plan[day][meal] = finalMealList[mealIndex];
            mealIndex++;
          } else {
            // Fallback to local recipes if somehow we don't have enough
            plan[day][meal] = recipes[mealIndex % recipes.length];
            mealIndex++;
          }
        }
      }

      return plan;
    } catch (err) {
      console.error("Error generating personalized meal plan", err);
      // Fallback to random plan on error
      return generateRandomMealPlan();
    }
  }

  // 🔄 Function to generate a random plan (fallback)
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

  // Load meal plan from backend on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        try {
          const token = await user.getIdToken();
          const res = await fetch("http://localhost:5000/meal-plan", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.plan) {
              setMealPlan(data.plan);
            } else {
              // If no plan in response, generate one
              await handleGenerateNewPlan(user.uid, token);
            }
          } else if (res.status === 404) {
            // No plan exists, generate one
            await handleGenerateNewPlan(user.uid, token);
          } else {
            console.error("Failed to load meal plan");
            // Fallback to random plan on error
            setMealPlan(generateRandomMealPlan());
          }
        } catch (err) {
          console.error("Error loading meal plan", err);
          // Fallback to random plan on error
          setMealPlan(generateRandomMealPlan());
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper function to generate new plan via backend
  async function handleGenerateNewPlan(uid: string, token: string) {
    try {
      const res = await fetch("http://localhost:5000/meal-plan/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setMealPlan(data.plan);
        } else {
          setMealPlan(generateRandomMealPlan());
        }
      } else {
        console.error("Failed to generate meal plan");
        setMealPlan(generateRandomMealPlan());
      }
    } catch (err) {
      console.error("Error generating meal plan", err);
      setMealPlan(generateRandomMealPlan());
    }
  }

  // 🗑️ Delete/replace logic
  const handleDeleteRecipe = (day: string, meal: string) => {
    setMealPlan((prev) => {
      if (!prev) return prev;
      
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

  // Watch recipe on YouTube
  const watchRecipe = async (name: string) => {
    try {
      const url = `https://ek-pineapple.app.n8n.cloud/webhook/ytb-lookup?dish=${encodeURIComponent(name)}`;
      console.log("Sending request to:", url);
      const res = await fetch(url);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Failed to fetch YouTube URL", err);
    }
  };

  const regeneratePlan = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        await handleGenerateNewPlan(user.uid, token);
      } catch (err) {
        console.error("Error regenerating meal plan", err);
        setMealPlan(generateRandomMealPlan());
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback to random if not authenticated
      setMealPlan(generateRandomMealPlan());
    }
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading meal plan...</p>
          </div>
        ) : mealPlan ? (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No meal plan available</p>
          </div>
        )}
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

              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => watchRecipe(selectedRecipe.name)}
                  className="w-full sm:w-auto"
                >
                  Watch on YouTube 🎥
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
