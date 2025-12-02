import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, Heart } from "lucide-react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Recipe {
  id?: string;
  name?: string;
  img_src?: string;
  image?: string;
  image_url?: string;
  calories?: number;
  protein_grams?: number;
  protein?: number;
  fat_grams?: number;
  fat?: number;
  carbs_grams?: number;
  carbs?: number;
  cook_time?: string;
  total_time?: string;
  prep_time?: string;
  servings?: string | number;
  yield?: string | number;
  ingredients?: string[] | string;
  directions?: string[] | string;
  instructions?: string[] | string;
  rating?: number;
  cuisine_path?: string;
  url?: string;
  [key: string]: any;
}

function safeList(val?: string[] | string): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(/[\r\n;,]+/).map((s) => s.trim()).filter(Boolean);
}
function difficultyFromRating(r?: number) {
  if (r == null) return "Unknown";
  if (r >= 4.5) return "Easy";
  if (r >= 4.0) return "Medium";
  if (r >= 3.0) return "Hard";
  return "Average";
}

export function Favorites() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [unfavoriting, setUnfavoriting] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:8000/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setFavorites([]);
        } else {
          const data = await res.json();
          // Patch _id from backend into id for consistency
          const fixed = Array.isArray(data) 
            ? data.map(item => ({
                ...item,
                id: item.id || item._id || undefined,
              }))
            : [];
          setFavorites(fixed);
        }
      } catch {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    });
    return () => { unsubscribe && unsubscribe(); };
  }, []);

  // Unfavorite (remove) handler
  const handleUnfavorite = async (recipeId: string | undefined) => {
    if (!recipeId) return;
    setUnfavoriting(recipeId);
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://localhost:8000/favorites/${encodeURIComponent(recipeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((r) => r.id !== recipeId));
        if (selectedRecipe?.id === recipeId) setSelectedRecipe(null);
      }
    } finally {
      setUnfavoriting(null);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Favorites</h2>
        {loading ? (
          <div className="text-center py-12">Loading your favorites...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <div className="mb-1">No favorited recipes yet!</div>
            <div className="text-muted-foreground text-sm">Recipes you favorite will show up here.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((recipe, idx) => {
              const id = recipe.id ?? `${idx}-${(recipe.name || 'untitled').replace(/\s+/g, "-")}`;
              const title = recipe.name || "Untitled";
              const img = recipe.img_src || recipe.image || recipe.image_url || "";
              const calories = recipe.calories ?? recipe.calories;
              const protein = recipe.protein_grams ?? recipe.protein;
              const carbs = recipe.carbs_grams ?? recipe.carbs;
              const fat = recipe.fat_grams ?? recipe.fat;
              const cookTime = recipe.total_time || recipe.cook_time || recipe.prep_time || "";
              const servings = recipe.servings ?? recipe.yield ?? "";
              const difficulty = difficultyFromRating(recipe.rating);
              return (
                <Card
                  key={id}
                  className="relative cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="relative">
                    <ImageWithFallback
                      src={img}
                      alt={title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {/* Heart icon (filled) for unfavorite */}
                    <button
                      type="button"
                      title="Remove from favorites"
                      onClick={e => { e.stopPropagation(); handleUnfavorite(recipe.id); }}
                      aria-label="Unfavorite"
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-2 border border-muted shadow focus:outline-none"
                      disabled={unfavoriting === recipe.id}
                    >
                      <Heart className={
                        `h-5 w-5 ${unfavoriting === recipe.id
                          ? 'animate-spin text-red-400'
                          : 'fill-red-500 text-red-500 hover:scale-110 transition-transform'} `
                      }
                      />
                    </button>
                    <Badge className="absolute bottom-2 right-2 bg-background/90 text-foreground">
                      {difficulty}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <h3 className="line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {cookTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {servings} servings
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <div className="text-primary">{calories ?? "-"}</div>
                          <div className="text-muted-foreground">cal</div>
                        </div>
                        <div>
                          <div className="text-primary">{protein ?? "-"}g</div>
                          <div className="text-muted-foreground">protein</div>
                        </div>
                        <div>
                          <div className="text-primary">{carbs ?? "-"}g</div>
                          <div className="text-muted-foreground">carbs</div>
                        </div>
                        <div>
                          <div className="text-primary">{fat ?? "-"}g</div>
                          <div className="text-muted-foreground">fat</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {/* Details Dialog */}
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedRecipe?.name}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedRecipe && (
              <div className="space-y-6">
                <ImageWithFallback
                  src={selectedRecipe.img_src || selectedRecipe.image || selectedRecipe.image_url || ""}
                  alt={selectedRecipe.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-lg text-primary">{selectedRecipe.calories ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                  <div>
                    <div className="text-lg text-primary">{selectedRecipe.protein_grams ?? selectedRecipe.protein ?? "-"}g</div>
                    <div className="text-xs text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="text-lg text-primary">{selectedRecipe.carbs_grams ?? selectedRecipe.carbs ?? "-"}g</div>
                    <div className="text-xs text-muted-foreground">Carbs</div>
                  </div>
                  <div>
                    <div className="text-lg text-primary">{selectedRecipe.fat_grams ?? selectedRecipe.fat ?? "-"}g</div>
                    <div className="text-xs text-muted-foreground">Fat</div>
                  </div>
                  <div>
                    <div className="text-lg text-primary">{selectedRecipe.total_time ?? selectedRecipe.cook_time ?? selectedRecipe.prep_time ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">Cook Time</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="mb-3">Ingredients</h4>
                    <ul className="space-y-2 text-sm">
                      {safeList(selectedRecipe.ingredients).map((ingredient, index) => (
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
                      {safeList(selectedRecipe.directions || selectedRecipe.instructions).map((instruction, index) => (
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
    </div>
  );
}