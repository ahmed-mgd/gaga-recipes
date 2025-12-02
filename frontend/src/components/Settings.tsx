import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Macros } from "./ProfileSetup";


interface ProfileData {
  age: string;
  gender: string;
  height: string;
  weight: string;
  activityLevel: string;
  dietaryRestrictions: string[];
  goal: string;
}

export function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    age: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "",
    dietaryRestrictions: [],
    goal: "",
  });

  const activityLevels = [
    { value: "sedentary", label: "Sedentary" },
    { value: "light", label: "Light" },
    { value: "moderate", label: "Moderate" },
    { value: "active", label: "Active" },
    { value: "very_active", label: "Very Active" }
  ];

  const goals = [
    { value: "lose", label: "Lose Weight" },
    { value: "maintain", label: "Maintain Weight" },
    { value: "gain", label: "Gain Muscle" }
  ];

  const dietaryOptions = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "None"];

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const profile = data.profile || {};
          if (mounted) {
            setProfileData(prev => ({
              ...prev,
              age: profile.age ?? prev.age,
              gender: profile.gender ?? prev.gender,
              height: profile.height ?? prev.height,
              weight: profile.weight ?? prev.weight,
              activityLevel: profile.activityLevel ?? prev.activityLevel,
              dietaryRestrictions: profile.dietaryRestrictions ?? prev.dietaryRestrictions,
              goal: profile.goal ?? prev.goal,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [navigate]);

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    setProfileData(prev => ({
      ...prev,
      dietaryRestrictions: checked
        ? [...prev.dietaryRestrictions.filter(r => r !== restriction), restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction)
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // --- 1️⃣ Send profile data to backend to calculate macros ---
      console.log("Sending profile data to backend:", profileData);

      const response = await fetch("http://localhost:8000/calculate_macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          age: Number(profileData.age),
          gender: profileData.gender,
          height: Number(profileData.height),
          weight: Number(profileData.weight),
          activity_level: profileData.activityLevel,
          goal: profileData.goal,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const macros: Macros = await response.json();
      console.log("Backend returned macros:", macros);

      // --- 2️⃣ Save profile + macros to Firestore ---
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          profile: profileData,
          macros,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("Profile and macros successfully saved to Firebase!");
      setMessage("Profile and macros updated.");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setMessage("Failed to save profile. Check console.");
    } finally {
      setSaving(false);
    }
};

 /* const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        profile: profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage("Profile updated.");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };*/

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      {message && <div className="mb-4 text-sm">{message}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              value={profileData.age}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProfileData(prev => ({ ...prev, age: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={profileData.gender}
              onValueChange={(value: string) => setProfileData(prev => ({ ...prev, gender: value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={profileData.height}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProfileData(prev => ({ ...prev, height: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={profileData.weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProfileData(prev => ({ ...prev, weight: e.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <Label>Activity Level</Label>
          <RadioGroup
            value={profileData.activityLevel}
            onValueChange={(value: string) => setProfileData(prev => ({ ...prev, activityLevel: value }))}
            className="space-y-2"
          >
            {activityLevels.map(l => (
              <label key={l.value} className="flex items-center gap-3 p-2 border rounded">
                <RadioGroupItem value={l.value} id={l.value} />
                <span>{l.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Dietary Restrictions</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dietaryOptions.map(opt => (
              <label key={opt} className="flex items-center gap-3 p-2 border rounded">
                <Checkbox
                  id={opt}
                  checked={profileData.dietaryRestrictions.includes(opt)}
                  onCheckedChange={(checked: boolean) => handleDietaryRestrictionChange(opt, checked)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Goal</Label>
          <RadioGroup
            value={profileData.goal}
            onValueChange={(value: string) => setProfileData(prev => ({ ...prev, goal: value }))}
            className="space-y-2"
          >
            {goals.map(g => (
              <label key={g.value} className="flex items-center gap-3 p-2 border rounded">
                <RadioGroupItem value={g.value} id={g.value} />
                <span>{g.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
