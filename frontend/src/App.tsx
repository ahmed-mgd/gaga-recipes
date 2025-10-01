import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileSetup } from "./components/ProfileSetup";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./components/Dashboard";
import { MealPlan } from "./components/MealPlan";
import { RecipeSearch } from "./components/RecipeSearch";
import { AuthScreen } from "./components/AuthScreen";
import NotFound from "./components/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* Main app routes with layout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="meal-plan" element={<MealPlan />} />
          <Route path="recipes" element={<RecipeSearch />} />
        </Route>

        {/* Redirect unknown routes to error page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}