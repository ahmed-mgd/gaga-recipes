import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Search, Clock, Users, Heart, ChevronLeft, ChevronRight } from "lucide-react";

interface Recipe {
  id?: string;
  name?: string;
  img_src?: string;
  image?: string;
  image_url?: string;
  calories?: number;
  protein_grams?: number;
  fat_grams?: number;
  carbs_grams?: number;
  cook_time?: string;
  prep_time?: string;
  total_time?: string;
  servings?: string | number;
  yield?: string | number;
  ingredients?: string[] | string;
  directions?: string[] | string;
  rating?: number;
  cuisine_path?: string;
  url?: string;
  [key: string]: any;
}

export function RecipeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [savedRecipes, setSavedRecipes] = useState<Record<string, boolean>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const PER_PAGE = 18;

  useEffect(() => {
    // do not read/write localStorage — keep favorites in-memory only
    fetchResults("a");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSaved = (id: string) => {
    setSavedRecipes(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const safeList = (val?: string[] | string): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val.split(/\r?\n|;|,/).map(s => s.trim()).filter(Boolean);
  };

  const difficultyFromRating = (r?: number) => {
    if (r == null) return "Unknown";
    if (r >= 4.5) return "Excellent";
    if (r >= 4.0) return "Great";
    if (r >= 3.0) return "Good";
    return "Average";
  };

  const fetchResults = async (q: string) => {
    if (!q || q.trim() === "") {
      setResults([]);
      setPage(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) setResults(data);
      else if (data?.recipes && Array.isArray(data.recipes)) setResults(data.recipes);
      else {
        console.warn("Unexpected search response", data);
        setResults([]);
      }
      setPage(1);
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchResults(query);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchResults(query);
    }
  };

  const totalPages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const displayed = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Search */}
        <div className="space-y-4 mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search recipes or ingredients..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((recipe, idx) => {
            const id = recipe.id ?? `${idx}-${(recipe.name || "untitled").replace(/\s+/g, "-")}`;
            const title = recipe.name || "Untitled";
            const img = recipe.img_src || recipe.image || recipe.image_url || "";
            const calories = recipe.calories ?? null;
            const protein = recipe.protein_grams ?? recipe.protein ?? null;
            const carbs = recipe.carbs_grams ?? null;
            const fat = recipe.fat_grams ?? null;
            const cookTime = recipe.total_time || recipe.cook_time || recipe.prep_time || "";
            const servings = recipe.servings ?? recipe.yield ?? "";
            const difficulty = difficultyFromRating(recipe.rating);
            const ingredients = safeList(recipe.ingredients);
            const directions = safeList(recipe.directions);

            const isSaved = !!savedRecipes[id];

            return (
              <Card
                key={id}
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="relative">
                  <ImageWithFallback
                    src={img}
                    alt={title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaved(id);
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                    />
                  </Button>

                  <Badge className="absolute bottom-2 right-2 bg-background/90 text-foreground">
                    {difficulty}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="line-clamp-2 group-hover:text-primary transition-colors">
                      {title}
                    </h3>

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
                        <div className="text-primary">{protein ?? "-" }g</div>
                        <div className="text-muted-foreground">protein</div>
                      </div>
                      <div>
                        <div className="text-primary">{carbs ?? "-" }g</div>
                        <div className="text-muted-foreground">carbs</div>
                      </div>
                      <div>
                        <div className="text-primary">{fat ?? "-" }g</div>
                        <div className="text-muted-foreground">fat</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {results.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        )}

        {/* Pagination */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * PER_PAGE + 1} - {Math.min(page * PER_PAGE, results.length)} of {results.length}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm">
                Page {page} / {totalPages}
              </div>

              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedRecipe?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedRecipe) toggleSaved(selectedRecipe.id ?? selectedRecipe.name ?? "unknown");
                }}
              >
                <Heart
                  className={`h-4 w-4 ${
                    selectedRecipe && savedRecipes[(selectedRecipe.id ?? selectedRecipe.name ?? "")] ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
              </Button>
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
                  <div className="text-lg text-primary">{selectedRecipe.protein_grams ?? "-" }g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.carbs_grams ?? "-" }g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.fat_grams ?? "-" }g</div>
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
                    {safeList(selectedRecipe.directions).map((instruction, index) => (
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

export default RecipeSearch;