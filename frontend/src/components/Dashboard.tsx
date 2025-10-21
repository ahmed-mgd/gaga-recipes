import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ProfileData, Macros } from '../components/ProfileSetup';
import { calculateMacros } from '../utils/macroCalculator';
import { 
  Zap,
  Target
} from "lucide-react";

interface DashboardProps {
  onNavigate: (screen: string) => void;
  userProfile?: ProfileData;
  userMacros?: Macros;
}

export function Dashboard({ onNavigate ,userProfile, userMacros }: DashboardProps) {
  const macros: Macros = userMacros || (userProfile ? calculateMacros(userProfile) : {
    calories: 2150,
    protein: 130,
    carbs: 220,
    fat: 75
  });
  

  const urgentIngredients = [
    "Spinach", "Chicken breast", "Greek yogurt", "Bell peppers", "Avocados"
  ];

  return (
    <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl mb-2">Welcome back!</h2>
              <p className="text-muted-foreground">Here's your nutrition overview for today.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Macros Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Daily Macros Target
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl text-primary mb-1">{macros.calories}</div>
                      <div className="text-sm text-muted-foreground">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl text-primary mb-1">{macros.protein}g</div>
                      <div className="text-sm text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl text-primary mb-1">{macros.carbs}g</div>
                      <div className="text-sm text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl text-primary mb-1">{macros.fat}g</div>
                      <div className="text-sm text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => onNavigate("meal-plan")}
                  >
                    Generate Meal Plan
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onNavigate("recipes")}
                  >
                    Browse Recipes
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Urgent Ingredients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Urgent Ingredients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Ingredients you need to use up soon:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {urgentIngredients.map((ingredient) => (
                        <Badge key={ingredient} variant="secondary">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onNavigate("recipes")}
                    >
                      Find Recipes Using These
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Created meal plan for this week</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Saved 3 new recipes</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Updated dietary preferences</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  );
}