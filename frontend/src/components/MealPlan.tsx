import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { recipes } from "./data/recipes";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Clock,
  BarChart3,
  ChefHat,
  Trash2,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Input } from "./ui/input";

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
  [key: string]: any;
}

export function MealPlan() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<Record<
    string,
    Record<string, Recipe | null>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState("current");
  const [pendingReplacements, setPendingReplacements] = useState<Set<string>>(
    new Set()
  );

  // Replacement modal state
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementSlot, setReplacementSlot] = useState<{
    day: string;
    meal: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [macrosModalOpen, setMacrosModalOpen] = useState(false);
  const [selectedDayMacros, setSelectedDayMacros] = useState<{
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  // Helpers
  const slotKey = (day: string, meal: string) => `${day}::${meal}`;

  function transformRecipe(backendRecipe: BackendRecipe): Recipe | null {
    if (!backendRecipe || !backendRecipe.name) return null;

    const id =
      backendRecipe.id ||
      backendRecipe._id ||
      (backendRecipe.url || backendRecipe.name || "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    let ingredients: string[] = [];
    if (Array.isArray(backendRecipe.ingredients))
      ingredients = backendRecipe.ingredients;
    else if (typeof backendRecipe.ingredients === "string")
      ingredients = backendRecipe.ingredients
        .split(/[,;\n\r]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);

    let instructions: string[] = [];
    const dir = backendRecipe.directions || backendRecipe.instructions || "";
    if (Array.isArray(dir)) instructions = dir;
    else if (typeof dir === "string") {
      instructions = dir
        .split(/[\n\r]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (instructions.length <= 1)
        instructions = dir
          .split(/\.\s+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
    }

    const calories =
      Number(backendRecipe.calories ?? backendRecipe.calories_kcal ?? 0) || 0;
    const protein =
      Number(backendRecipe.protein_grams ?? backendRecipe.protein ?? 0) || 0;
    const carbs =
      Number(backendRecipe.carbs_grams ?? backendRecipe.carbs ?? 0) || 0;
    const fat = Number(backendRecipe.fat_grams ?? backendRecipe.fat ?? 0) || 0;

    return {
      id,
      name: backendRecipe.name || "",
      image:
        backendRecipe.img_src ||
        backendRecipe.image ||
        backendRecipe.image_url ||
        "",
      calories,
      protein,
      carbs,
      fat,
      cookTime:
        backendRecipe.cook_time ||
        backendRecipe.total_time ||
        backendRecipe.prep_time ||
        "",
      servings: Number(backendRecipe.servings || backendRecipe.yield || 1) || 1,
      ingredients,
      instructions,
      tags: Array.isArray(backendRecipe.tags) ? backendRecipe.tags : [],
    };
  }

  // Load meal plan from backend on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        try {
          const token = await user.getIdToken();
          const res = await fetch("http://localhost:5000/meal-plan", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.plan) {
              const normalized: Record<
                string,
                Record<string, Recipe | null>
              > = {};
              for (const [dayKey, mealsObj] of Object.entries(
                data.plan || {}
              )) {
                normalized[dayKey] = {};
                for (const [mealKey, r] of Object.entries(mealsObj as any)) {
                  normalized[dayKey][mealKey] = r ? transformRecipe(r) : null;
                }
              }
              setMealPlan(normalized);
            } else {
              // fallback to local recipes
              setMealPlan(generateRandomMealPlan());
            }
          } else if (res.status === 404) {
            regeneratePlan();
          } else {
            setMealPlan(generateRandomMealPlan());
          }
        } catch (err) {
          console.error("Error loading meal plan", err);
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

  // Simple random plan fallback
  function generateRandomMealPlan() {
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    let index = 0;
    const plan: Record<string, Record<string, Recipe | null>> = {};
    for (const day of days) {
      plan[day] = {};
      for (const meal of meals) {
        plan[day][meal] = shuffled[index % shuffled.length];
        index++;
      }
    }
    return plan;
  }

  // Call backend to delete the slot, then mark pending replacement
  const handleDeleteRecipe = async (day: string, meal: string) => {
    const user = auth.currentUser;
    if (!user) {
      // still toggle pending locally
      setPendingReplacements((p) => new Set(p).add(slotKey(day, meal)));
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:5000/meal-plan/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ day, meal }),
      });

      if (res.ok) {
        // update local state: set slot to null
        setMealPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [day]: {
              ...prev[day],
              [meal]: null,
            },
          };
        });
        setPendingReplacements((p) => {
          const next = new Set(p);
          next.add(slotKey(day, meal));
          return next;
        });
      } else {
        const err = await res.json();
        console.error("Failed to delete slot:", err);
      }
    } catch (e) {
      console.error("Delete request failed", e);
    }
  };

  // Open replacement modal and fetch suggestions
  const openReplacementModal = async (day: string, meal: string) => {
    setReplacementSlot({ day, meal });
    setReplacementOpen(true);
    setSuggestions([]);
    setSearchResults([]);
    setSearchQuery("");
    setSuggestionsLoading(true);

    const user = auth.currentUser;
    let token = "";
    if (user) token = await user.getIdToken();

    try {
      const res = await fetch("http://localhost:5000/meal-plan/replacements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ day, meal }),
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.suggestions) ? data.suggestions : data;
        const transformed = list
          .map(transformRecipe)
          .filter((r): r is Recipe => r !== null);
        setSuggestions(transformed);
      } else {
        console.error("Failed to fetch suggestions");
      }
    } catch (e) {
      console.error("Error fetching suggestions", e);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Search backend /api/search for more recipes
  const performSearch = async (q: string) => {
    if (!q || q.trim() === "") {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      const res = await fetch(
        `http://localhost:5000/api/search?${params.toString()}`
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.recipes ?? [];
      const transformed = list
        .map(transformRecipe)
        .filter((r): r is Recipe => r !== null);
      setSearchResults(transformed);
    } catch (e) {
      console.error("Search failed", e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // When user picks a recipe in modal, call backend add and update local plan
  const handleSelectReplacement = async (recipe: Recipe) => {
    if (!replacementSlot) return;
    const { day, meal } = replacementSlot;

    const user = auth.currentUser;
    let token = "";
    if (user) token = await user.getIdToken();

    try {
      const res = await fetch("http://localhost:5000/meal-plan/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ day, meal, recipe }),
      });

      if (res.ok) {
        // update local plan with the selected recipe
        setMealPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [day]: {
              ...prev[day],
              [meal]: recipe,
            },
          };
        });
        // clear pending state and close modal
        setPendingReplacements((p) => {
          const next = new Set(p);
          next.delete(slotKey(day, meal));
          return next;
        });
        setReplacementOpen(false);
        setReplacementSlot(null);
      } else {
        const err = await res.json();
        console.error("Failed to add replacement:", err);
      }
    } catch (e) {
      console.error("Error adding replacement", e);
    }
  };

  // UI handlers
  const handleTogglePendingReplacement = (day: string, meal: string) => {
    const k = slotKey(day, meal);
    setPendingReplacements((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // Clicking the refresh (Replace) button opens modal
  const handleReplaceButtonClick = (day: string, meal: string) => {
    openReplacementModal(day, meal);
  };

  const openRecipeDialog = (recipe: Recipe | null) => {
    if (recipe) setSelectedRecipe(recipe);
  };

  const regeneratePlan = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:5000/meal-plan/generate", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            const normalized: Record<
              string,
              Record<string, Recipe | null>
            > = {};
            for (const [dayKey, mealsObj] of Object.entries(data.plan || {})) {
              normalized[dayKey] = {};
              for (const [mealKey, r] of Object.entries(mealsObj as any)) {
                normalized[dayKey][mealKey] = r ? transformRecipe(r) : null;
              }
            }
            setMealPlan(normalized);
          }
        }
      } catch (err) {
        console.error("Error regenerating meal plan", err);
      } finally {
        setLoading(false);
      }
    } else {
      setMealPlan(generateRandomMealPlan());
    }
  };

  // Memoize daily totals so they recompute whenever mealPlan changes
  const dailyTotals = useMemo(() => {
    if (!mealPlan) return {};

    const totals: Record<
      string,
      {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }
    > = {};

    for (const day of days) {
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;

      const dayMeals = mealPlan[day];
      if (dayMeals) {
        Object.values(dayMeals).forEach((recipe) => {
          if (recipe) {
            calories += recipe.calories || 0;
            protein += recipe.protein || 0;
            carbs += recipe.carbs || 0;
            fat += recipe.fat || 0;
          }
        });
      }

      totals[day] = {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      };
    }

    return totals;
  }, [mealPlan, days]);

  const handleShowDayMacros = (day: string) => {
    const totals = dailyTotals[day] || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    setSelectedDayMacros({ day, ...totals });
    setMacrosModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading meal plan...</p>
          </div>
        ) : mealPlan ? (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {days.map((day) => {
              const dayTotals = dailyTotals[day] || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
              };
              return (
                <div key={day} className="space-y-4">
                  <div className="text-center p-3 bg-primary/10 rounded-lg border space-y-1">
                    <h3 className="font-semibold">{day}</h3>
                    <div
                      className="flex items-center justify-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleShowDayMacros(day)}
                    >
                      <span>{dayTotals.calories} cal</span>
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  {meals.map((meal) => {
                    const recipe = mealPlan[day][meal] ?? null;
                    const pending = pendingReplacements.has(slotKey(day, meal));
                    return (
                      <Card
                        key={`${day}-${meal}`}
                        className="hover:shadow-md transition-shadow relative"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs text-primary uppercase tracking-wide">
                            {meal}
                            <Trash2
                              className={`h-4 w-4 ${
                                pending
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-destructive"
                              } cursor-pointer`}
                              onClick={() => handleDeleteRecipe(day, meal)}
                            />
                          </div>

                          {pending || !recipe ? (
                            <div className="flex items-center justify-center py-6">
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  handleReplaceButtonClick(day, meal)
                                }
                                className="flex items-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Replace
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => openRecipeDialog(recipe)}
                              className="cursor-pointer"
                            >
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
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No meal plan available</p>
          </div>
        )}
      </div>

      {/* Recipe Details Dialog */}
      <Dialog
        open={!!selectedRecipe}
        onOpenChange={() => setSelectedRecipe(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedRecipe?.servings} servings
            </p>
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
                  <div className="text-lg text-primary">
                    {selectedRecipe.calories}
                  </div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="text-lg text-primary">
                    {selectedRecipe.protein}g
                  </div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-lg text-primary">
                    {selectedRecipe.carbs}g
                  </div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="text-lg text-primary">
                    {selectedRecipe.fat}g
                  </div>
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

      {/* Replacement Modal (vertical scrollbar like recipe dialog; 3 cards per row) */}
      <Dialog
        open={replacementOpen}
        onOpenChange={() => {
          setReplacementOpen(false);
          setReplacementSlot(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>
              Replace{" "}
              {replacementSlot
                ? `${replacementSlot.day} — ${replacementSlot.meal}`
                : "meal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Suggestions (top) */}
            <div>
              <h4 className="mb-2 text-sm text-muted-foreground">
                Recommended
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {suggestionsLoading ? (
                  <div className="text-muted-foreground">
                    Loading suggestions...
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-muted-foreground">
                    No recommendations
                  </div>
                ) : (
                  suggestions.map((s) => (
                    <Card
                      key={s.id}
                      className="w-40 flex-shrink-0 cursor-pointer"
                      onClick={() => handleSelectReplacement(s)}
                    >
                      <ImageWithFallback
                        src={s.image}
                        alt={s.name}
                        className="w-full h-24 object-cover rounded-t-md"
                      />
                      <CardContent className="p-2">
                        <div className="text-xs font-medium line-clamp-2">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {s.calories} cal
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <hr />

            {/* Search area */}
            <div>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") performSearch(searchQuery);
                  }}
                />
                <Button onClick={() => performSearch(searchQuery)}>
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* 3 cards per row, content will scroll via DialogContent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {searchLoading ? (
                  <div className="text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-muted-foreground">No results</div>
                ) : (
                  searchResults.map((r) => (
                    <Card
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => handleSelectReplacement(r)}
                    >
                      <ImageWithFallback
                        src={r.image}
                        alt={r.name}
                        className="w-full h-24 object-cover rounded-t-md"
                      />
                      <CardContent className="p-2">
                        <div className="text-xs font-medium line-clamp-2">
                          {r.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {r.calories} cal
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Macros Modal */}
      <Dialog open={macrosModalOpen} onOpenChange={setMacrosModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDayMacros?.day} - Daily Totals</DialogTitle>
          </DialogHeader>
          {selectedDayMacros && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                    Calories
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {selectedDayMacros.calories}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    kcal
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Protein
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {selectedDayMacros.protein}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    g
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Carbs
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {selectedDayMacros.carbs}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    g
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Fat
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {selectedDayMacros.fat}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    g
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
