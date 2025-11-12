import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export interface ProfileData {
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: string;
  dietaryRestrictions: string[];
  goal: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function ProfileSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const totalSteps = 4;

  const [profileData, setProfileData] = useState<ProfileData>({
    age: 0,
    gender: "",
    height: 0,
    weight: 0,
    activityLevel: "",
    dietaryRestrictions: [],
    goal: "",
  });

  const progress = (currentStep / totalSteps) * 100;

  // --- Helper functions ---
  const handleNumberInputChange = (field: 'age' | 'height' | 'weight', value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setProfileData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleNumberInputChange = (field: 'age' | 'height' | 'weight', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setProfileData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    setProfileData(prev => ({
      ...prev,
      dietaryRestrictions: checked
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction),
    }));
  };

  const handleSubmit = async () => {
  const user = auth.currentUser;
  if (!user) {
    navigate("/auth");
    return;
  }

  setSaving(true);
  try {
    // --- Prepare payload for backend ---
    const payload = {
      uid: user.uid,
      age: Number(profileData.age),
      gender: profileData.gender,
      weight: Number(profileData.weight),
      height: Number(profileData.height),
      activity_level: profileData.activityLevel, // map to backend field
      goal: profileData.goal
    };

    console.log("Sending payload to backend:", payload);

    // --- Call backend ---
    const res = await fetch("http://localhost:5000/calculate_macros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }

    const macros: Macros = await res.json();
    console.log("Macros received:", macros);

    // --- Save profile + macros to Firebase ---
    await setDoc(
      doc(db, "users", user.uid),
      {
        profile: profileData,
        macros,
        email: user.email || null,
        displayName: user.displayName || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    navigate("/dashboard");
  } catch (err) {
    console.error("Failed to save profile or calculate macros:", err);
    alert("There was an error saving your profile. See console for details.");
  } finally {
    setSaving(false);
  }
};


  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const activityLevels = [
    { value: "sedentary", label: "Sedentary", description: "Little to no exercise" },
    { value: "light", label: "Light", description: "Exercise 1–3 times/week" },
    { value: "moderate", label: "Moderate", description: "Exercise 4–5 times/week" },
    { value: "active", label: "Active", description: "Daily exercise" },
    { value: "very_active", label: "Very Active", description: "Intense exercise 6-7 times/week" },
  ];

  const goals = [
    { value: "lose", label: "Lose Weight", description: "Create a caloric deficit" },
    { value: "maintain", label: "Maintain Weight", description: "Stay at current weight" },
    { value: "gain", label: "Gain Muscle", description: "Build muscle and strength" },
  ];

  // --- Render UI ---
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
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profileData.age}
                    onChange={(e) => handleNumberInputChange("age", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profileData.gender}
                    onValueChange={(value: string) => setProfileData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={profileData.height}
                    onChange={(e) => handleNumberInputChange("height", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={profileData.weight}
                    onChange={(e) => handleNumberInputChange("weight", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Activity Level */}
            {currentStep === 2 && (
              <RadioGroup
                value={profileData.activityLevel}
                onValueChange={(value: string) => setProfileData(prev => ({ ...prev, activityLevel: value }))}
                className="space-y-4"
              >
                {activityLevels.map(level => (
                  <div key={level.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <RadioGroupItem value={level.value} id={level.value} />
                    <div className="flex-1">
                      <Label htmlFor={level.value} className="cursor-pointer">{level.label}</Label>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 3: Dietary Restrictions */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "None"].map(restriction => (
                  <div key={restriction} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <Checkbox
                      id={restriction}
                      checked={profileData.dietaryRestrictions.includes(restriction)}
                      onCheckedChange={(checked: boolean) => handleDietaryRestrictionChange(restriction, checked)}
                    />
                    <Label htmlFor={restriction} className="cursor-pointer flex-1">{restriction}</Label>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Goals */}
            {currentStep === 4 && (
              <RadioGroup
                value={profileData.goal}
                onValueChange={(value: string) => setProfileData(prev => ({ ...prev, goal: value }))}
                className="space-y-4"
              >
                {goals.map(goal => (
                  <div key={goal.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent">
                    <RadioGroupItem value={goal.value} id={goal.value} />
                    <div className="flex-1">
                      <Label htmlFor={goal.value} className="cursor-pointer">{goal.label}</Label>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 1}>Back</Button>
              <Button type="button" onClick={handleNext}>{currentStep === totalSteps ? "Complete Setup" : "Next"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
