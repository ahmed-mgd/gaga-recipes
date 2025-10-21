import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

interface ProfileSetupProps {
  onComplete: () => void;
}

type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active" | "";
type Goal = "lose" | "maintain" | "gain" | "";

export interface ProfileData {
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  dietaryRestrictions: string[];
  goal: Goal;
  urgentIngredients: string[];
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    age: 0,
    gender: "",
    height: 0,
    weight: 0,
    activityLevel: "",
    dietaryRestrictions: [],
    goal: "",
    urgentIngredients: []
  });
  const [ingredientInput, setIngredientInput] = useState("");

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNumberInputChange = (field: 'age' | 'height' | 'weight', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setProfileData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    setProfileData(prev => ({
      ...prev,
      dietaryRestrictions: checked 
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction)
    }));
  };

  const addIngredient = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && ingredientInput.trim()) {
      e.preventDefault();
      setProfileData(prev => ({
        ...prev,
        urgentIngredients: [...prev.urgentIngredients, ingredientInput.trim()]
      }));
      setIngredientInput("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setProfileData(prev => ({
      ...prev,
      urgentIngredients: prev.urgentIngredients.filter(i => i !== ingredient)
    }));
  };

   const activityLevels: { value: ActivityLevel; label: string; description: string }[] = [
    { value: "sedentary", label: "Sedentary", description: "Little to no exercise" },
    { value: "light", label: "Light", description: "Exercise 1-3 times/week" },
    { value: "moderate", label: "Moderate", description: "Exercise 4-5 times/week" },
    { value: "active", label: "Active", description: "Daily exercise" },
    { value: "very_active", label: "Very Active", description: "Intense exercise 6-7 times/week" }
  ];

  const goals = [
    { value: "lose", label: "Lose Weight", description: "Create a caloric deficit" },
    { value: "maintain", label: "Maintain Weight", description: "Stay at current weight" },
    { value: "gain", label: "Gain Muscle", description: "Build muscle and strength" }
  ];

 return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Basic Information"}
              {currentStep === 2 && "Activity Level"}
              {currentStep === 3 && "Dietary Restrictions"}
              {currentStep === 4 && "Health Goals"}
              {currentStep === 5 && "Urgent Ingredients"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={profileData.age || ""}
                    onChange={(e) => handleNumberInputChange('age', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={profileData.gender} onValueChange={(value: string) => setProfileData(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Enter your height"
                    value={profileData.height || ""}
                    onChange={(e) => handleNumberInputChange('height', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="Enter your weight"
                    value={profileData.weight || ""}
                    onChange={(e) => handleNumberInputChange('weight', e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <RadioGroup 
                value={profileData.activityLevel} 
                onValueChange={(value: ActivityLevel) => setProfileData(prev => ({ ...prev, activityLevel: value }))}
                className="space-y-4"
              >
                {activityLevels.map((level) => (
                  <div key={level.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <RadioGroupItem value={level.value} id={level.value} />
                    <div className="flex-1">
                      <Label htmlFor={level.value} className="cursor-pointer">
                        {level.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                {["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "None"].map((restriction) => (
                  <div key={restriction} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <Checkbox
                      id={restriction}
                      checked={profileData.dietaryRestrictions.includes(restriction)}
                      onCheckedChange={(checked: boolean | "indeterminate") => handleDietaryRestrictionChange(restriction, checked === true)}
                    />
                    <Label htmlFor={restriction} className="cursor-pointer flex-1">
                      {restriction}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {currentStep === 4 && (
              <RadioGroup 
                value={profileData.goal} 
                onValueChange={(value: Goal) => setProfileData(prev => ({ ...prev, goal: value }))}
                className="space-y-4"
              >
                {goals.map((goal) => (
                  <div key={goal.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <RadioGroupItem value={goal.value} id={goal.value} />
                    <div className="flex-1">
                      <Label htmlFor={goal.value} className="cursor-pointer">
                        {goal.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Add ingredients you need to use up</Label>
                  <Input
                    id="ingredients"
                    placeholder="Type an ingredient and press Enter"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    onKeyDown={addIngredient}
                  />
                </div>
                {profileData.urgentIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profileData.urgentIngredients.map((ingredient) => (
                      <Badge key={ingredient} variant="secondary" className="flex items-center gap-1">
                        {ingredient}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeIngredient(ingredient)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
              >
                {currentStep === totalSteps ? "Complete Setup" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}