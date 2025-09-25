import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface AuthScreenProps {
  onAuthComplete: () => void;
}

export function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth process
    setTimeout(() => {
      setIsLoading(false);
      onAuthComplete();
    }, 1500);
  };

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onAuthComplete();
    }, 1000);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/10 to-primary/5 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1619524537696-3309f8843e92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxudXRyaXRpb24lMjBhcHAlMjBpbGx1c3RyYXRpb258ZW58MXx8fHwxNzU4MDYwNjg1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Meal planning illustration" 
            className="w-80 h-80 object-cover rounded-2xl mb-8 mx-auto"
          />
          <h2 className="text-2xl mb-4 text-foreground">Smart Meal Planning</h2>
          <p className="text-muted-foreground">Plan your meals, track nutrition, and achieve your health goals with personalized recommendations.</p>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                    >
                      Continue with Google
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                    >
                      Continue with Google
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}