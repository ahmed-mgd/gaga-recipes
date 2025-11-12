import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ImageWithFallback } from "./figma/ImageWithFallback"
import { useNavigate } from "react-router-dom"

import {
  doSignInWithEmailAndPassword,
  doCreateUserWithEmailAndPassword,
  doSignInWithGoogle,
} from "../firebase/auth"
import { getAdditionalUserInfo } from "firebase/auth"
import { auth } from "../firebase/firebase";

interface AuthScreenProps {}

export function AuthScreen({}: AuthScreenProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });
    return unsubscribe;
  }, [navigate]);

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.querySelector("#signin-email") as HTMLInputElement).value
    const password = (form.querySelector("#signin-password") as HTMLInputElement).value

    setIsLoading(true)
    setErrorMessage("")
    try {
      await doSignInWithEmailAndPassword(email, password)
      navigate("/dashboard")
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMessage(err.message)
      else setErrorMessage("An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.querySelector("#signup-email") as HTMLInputElement).value
    const password = (form.querySelector("#signup-password") as HTMLInputElement).value
    const confirmPassword = (form.querySelector("#confirm-password") as HTMLInputElement).value

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    setIsLoading(true)
    setErrorMessage("")
    try {
      await doCreateUserWithEmailAndPassword(email, password)
      navigate("/profile-setup")
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMessage(err.message)
      else setErrorMessage("An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    setErrorMessage("")
    try {
      const result = await doSignInWithGoogle()
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser

      if (isNewUser) {
        navigate("/profile-setup")
      } else {
        navigate("/dashboard")
      }
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMessage(err.message)
      else setErrorMessage("An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/10 to-primary/5 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1619524537696-3309f8843e92?..."
            alt="Meal planning illustration" 
            className="w-80 h-80 object-cover rounded-2xl mb-8 mx-auto"
          />
          <h2 className="text-2xl mb-4 text-foreground">Recipe App</h2>
          <p className="text-muted-foreground">
            Plan your meals, track nutrition, and achieve your health goals with personalized recommendations.
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" type="password" required />
                    </div>

                    {errorMessage && (
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    )}

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

            {/* Sign Up */}
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" type="password" required />
                    </div>

                    {errorMessage && (
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    )}

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
  )
}
