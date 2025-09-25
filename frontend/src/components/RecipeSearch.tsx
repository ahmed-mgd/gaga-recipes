import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Search, Clock, Users, Heart, Filter } from "lucide-react";

interface RecipeSearchProps {}

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
  difficulty: "Easy" | "Medium" | "Hard";
}

export function RecipeSearch({}: RecipeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);

  const filterOptions = [
    "Quick & Easy", "High Protein", "Low Carb", "Vegetarian", 
    "Vegan", "Gluten-Free", "Dairy-Free", "One Pot"
  ];

  // Sample recipe data
  const recipes: Recipe[] = [
    {
      id: "1",
      name: "Mediterranean Chickpea Salad",
      image: "https://images.unsplash.com/photo-1627348440938-7107a6f3d773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZWNpcGUlMjBjYXJkcyUyMGZvb2QlMjBsYXlvdXR8ZW58MXx8fHwxNzU4MDYwNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      calories: 380,
      protein: 15,
      carbs: 45,
      fat: 12,
      cookTime: "15 min",
      servings: 4,
      difficulty: "Easy",
      ingredients: [
        "2 cans chickpeas, drained",
        "1 cucumber, diced",
        "2 tomatoes, diced",
        "1/2 red onion, diced",
        "1/2 cup feta cheese",
        "1/4 cup olive oil",
        "2 tbsp lemon juice",
        "Fresh herbs"
      ],
      instructions: [
        "Drain and rinse chickpeas",
        "Dice all vegetables",
        "Combine chickpeas and vegetables in a large bowl",
        "Whisk together olive oil, lemon juice, and seasonings",
        "Toss salad with dressing",
        "Top with feta cheese and fresh herbs",
        "Serve chilled"
      ],
      tags: ["Vegetarian", "High Protein", "Quick & Easy", "Mediterranean"]
    },
    {
      id: "2",
      name: "Grilled Chicken Quinoa Bowl",
      image: "https://images.unsplash.com/photo-1627348440938-7107a6f3d773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZWNpcGUlMjBjYXJkcyUyMGZvb2QlMjBsYXlvdXR8ZW58MXx8fHwxNzU4MDYwNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      calories: 520,
      protein: 35,
      carbs: 40,
      fat: 18,
      cookTime: "30 min",
      servings: 2,
      difficulty: "Medium",
      ingredients: [
        "2 chicken breasts",
        "1 cup quinoa",
        "Mixed vegetables",
        "Avocado",
        "Lime",
        "Cilantro",
        "Olive oil",
        "Spices"
      ],
      instructions: [
        "Season and grill chicken breasts",
        "Cook quinoa according to package directions",
        "Prepare vegetables",
        "Slice avocado",
        "Assemble bowls with quinoa base",
        "Top with grilled chicken and vegetables",
        "Garnish with avocado and cilantro"
      ],
      tags: ["High Protein", "Gluten-Free", "Meal Prep"]
    },
    {
      id: "3",
      name: "Vegetarian Lentil Curry",
      image: "https://images.unsplash.com/photo-1627348440938-7107a6f3d773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZWNpcGUlMjBjYXJkcyUyMGZvb2QlMjBsYXlvdXR8ZW58MXx8fHwxNzU4MDYwNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      calories: 340,
      protein: 18,
      carbs: 50,
      fat: 8,
      cookTime: "45 min",
      servings: 6,
      difficulty: "Medium",
      ingredients: [
        "2 cups red lentils",
        "1 can coconut milk",
        "2 cups vegetable broth",
        "1 onion, diced",
        "3 cloves garlic",
        "2 tsp curry powder",
        "1 tsp turmeric",
        "Fresh ginger"
      ],
      instructions: [
        "Sauté onion until translucent",
        "Add garlic, ginger, and spices",
        "Add lentils and broth",
        "Simmer for 25-30 minutes",
        "Stir in coconut milk",
        "Season with salt and pepper",
        "Serve with rice or naan"
      ],
      tags: ["Vegetarian", "Vegan", "One Pot", "High Protein"]
    },
    {
      id: "4",
      name: "Zucchini Noodles with Pesto",
      image: "https://images.unsplash.com/photo-1627348440938-7107a6f3d773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZWNpcGUlMjBjYXJkcyUyMGZvb2QlMjBsYXlvdXR8ZW58MXx8fHwxNzU4MDYwNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      calories: 280,
      protein: 12,
      carbs: 15,
      fat: 20,
      cookTime: "20 min",
      servings: 4,
      difficulty: "Easy",
      ingredients: [
        "4 medium zucchini",
        "1/2 cup basil pesto",
        "1/4 cup pine nuts",
        "Cherry tomatoes",
        "Parmesan cheese",
        "Olive oil",
        "Salt and pepper"
      ],
      instructions: [
        "Spiralize zucchini into noodles",
        "Heat olive oil in large pan",
        "Sauté zucchini noodles for 2-3 minutes",
        "Toss with pesto sauce",
        "Add cherry tomatoes",
        "Top with pine nuts and Parmesan",
        "Serve immediately"
      ],
      tags: ["Low Carb", "Vegetarian", "Quick & Easy", "Keto-Friendly"]
    }
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.ingredients.some(ingredient => 
                           ingredient.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesFilters = selectedFilters.length === 0 || 
                          selectedFilters.some(filter => recipe.tags.includes(filter));
    
    return matchesSearch && matchesFilters;
  });

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleSaved = (recipeId: string) => {
    setSavedRecipes(prev => 
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const openRecipeDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  return (
    <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((filter) => (
                  <Badge
                    key={filter}
                    variant={selectedFilters.includes(filter) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter(filter)}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => openRecipeDialog(recipe)}
              >
                <div className="relative">
                  <ImageWithFallback
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaved(recipe.id);
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 ${
                        savedRecipes.includes(recipe.id) 
                          ? "fill-red-500 text-red-500" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                  <Badge className="absolute bottom-2 right-2 bg-background/90 text-foreground">
                    {recipe.difficulty}
                  </Badge>
                </div>
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="line-clamp-2 group-hover:text-primary transition-colors">
                      {recipe.name}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.cookTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings} servings
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <div className="text-primary">{recipe.calories}</div>
                        <div className="text-muted-foreground">cal</div>
                      </div>
                      <div>
                        <div className="text-primary">{recipe.protein}g</div>
                        <div className="text-muted-foreground">protein</div>
                      </div>
                      <div>
                        <div className="text-primary">{recipe.carbs}g</div>
                        <div className="text-muted-foreground">carbs</div>
                      </div>
                      <div>
                        <div className="text-primary">{recipe.fat}g</div>
                        <div className="text-muted-foreground">fat</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{recipe.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg mb-2">No recipes found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}
        </div>

      {/* Recipe Details Dialog */}
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
                  if (selectedRecipe) toggleSaved(selectedRecipe.id);
                }}
              >
                <Heart 
                  className={`h-4 w-4 ${
                    selectedRecipe && savedRecipes.includes(selectedRecipe.id) 
                      ? "fill-red-500 text-red-500" 
                      : "text-muted-foreground"
                  }`} 
                />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6">
              <ImageWithFallback
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
                <div>
                  <div className="text-lg text-primary">{selectedRecipe.cookTime}</div>
                  <div className="text-xs text-muted-foreground">Cook Time</div>
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