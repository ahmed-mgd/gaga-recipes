import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export function AppLayout({ children, currentScreen, onNavigate, onLogout }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "recipes", label: "Recipes", icon: BookOpen },
    { id: "meal-plan", label: "Meal Plan", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const getPageTitle = () => {
    switch(currentScreen) {
      case "dashboard": return "Dashboard";
      case "recipes": return "Recipe Search";
      case "meal-plan": return "Weekly Meal Plan";
      case "settings": return "Settings";
      default: return "Smart Meal Planner";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
          <h1 className="text-xl">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {!sidebarCollapsed && "Logout"}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-background border-r min-h-[calc(100vh-73px)] transition-all duration-200 ease-in-out`}>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentScreen === item.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="overflow-hidden">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}