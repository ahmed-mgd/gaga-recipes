import { useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { ProfileSetup } from "./components/ProfileSetup";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./components/Dashboard";
import { MealPlan } from "./components/MealPlan";
import { RecipeSearch } from "./components/RecipeSearch";

type AppState = "auth" | "profile-setup" | "dashboard" | "meal-plan" | "recipes";

export default function App() {
  const [appState, setAppState] = useState<AppState>("auth");

  const handleAuthComplete = () => {
    setAppState("profile-setup");
  };

  const handleProfileSetupComplete = () => {
    setAppState("dashboard");
  };

  const handleNavigation = (screen: string) => {
    setAppState(screen as AppState);
  };

  const handleLogout = () => {
    setAppState("auth");
  };

  const renderMainContent = () => {
    switch(appState) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigation} />;
      case "meal-plan":
        return <MealPlan />;
      case "recipes":
        return <RecipeSearch />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  const isMainApp = ["dashboard", "meal-plan", "recipes", "settings"].includes(appState);

  return (
    <div className="min-h-screen bg-background">
      {appState === "auth" && (
        <AuthScreen onAuthComplete={handleAuthComplete} />
      )}
      
      {appState === "profile-setup" && (
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      )}
      
      {isMainApp && (
        <AppLayout 
          currentScreen={appState}
          onNavigate={handleNavigation} 
          onLogout={handleLogout}
        >
          {renderMainContent()}
        </AppLayout>
      )}
    </div>
  );
}