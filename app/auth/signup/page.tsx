"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { usePostAuthRedirect } from "@/hooks/use-post-auth-redirect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"
import { Eye, EyeOff, UserPlus, RefreshCw, Mail, Home } from "lucide-react"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const { signUp, signInWithDiscord } = useAuth()
  const router = useRouter()
  
  // Use unified post-auth redirect hook
  usePostAuthRedirect({
    redirectFromPages: ['/auth/signup'],
    redirectDelay: 100
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const { error: signUpError } = await signUp(email, password, name)
      
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleDiscordSignup = async () => {
    setDiscordLoading(true)
    setError("")
    
    try {
      await signInWithDiscord()
      // Discord OAuth will handle the redirect
    } catch (err: any) {
      console.error("Discord signup error:", err)
      setError(err.message || "Could not sign up with Discord")
      setDiscordLoading(false)
    }
  }

  const clearErrors = () => {
    setError("")
  }

  if (success) {
    return (
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            {/* Subtle white glowing dots */}
            <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
            <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
            <div className="w-full max-w-md">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-2xl text-white font-semibold">Check Your Email</CardTitle>
              <CardDescription className="text-slate-200">
                We've sent you a confirmation link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  <div className="space-y-2">
                    <p><strong>Almost there!</strong> We've sent a confirmation email to:</p>
                    <p className="font-mono text-sm bg-white/10 p-2 rounded">{email}</p>
                    <div className="text-xs space-y-1">
                      <p>• Click the link in the email to verify your account</p>
                      <p>• Check your spam folder if you don't see it</p>
                      <p>• The link will expire in 24 hours</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="text-center space-y-4">
                <Button
                  onClick={() => {
                    setSuccess(false)
                    setEmail("")
                    setPassword("")
                    setName("")
                  }}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Sign Up Different Account
                </Button>
                
                <div className="text-sm text-slate-300">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Sign in
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
          <PublicFooter />
        </div>
      </VideoBackground>
    )
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Subtle white glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          <div className="w-full max-w-md">
        <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white font-semibold">Join Raptor Esports</CardTitle>
            <CardDescription className="text-slate-200">
              Create your account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {error}
                  {error.includes("already") && (
                    <div className="mt-2 text-xs">
                      <p>• Try signing in instead</p>
                      <p>• Use a different email address</p>
                      <p>• Contact support if you need help</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">In Game Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your in-game name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) clearErrors()
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  required
                  disabled={loading || discordLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) clearErrors()
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  required
                  disabled={loading || discordLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) clearErrors()
                    }}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 pr-10"
                    required
                    disabled={loading || discordLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || discordLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                <div className="text-xs text-slate-400">
                  Password must be at least 6 characters long
                </div>
              </div>
              
              <Button 
                type="submit" 
                className={`w-full ${getButtonStyle('primary')}`}
                disabled={loading || discordLoading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
            
            {/* Discord OAuth temporarily disabled */}
            {false && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-black/60 px-2 text-slate-400">Or continue with</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2]"
                  onClick={handleDiscordSignup}
                  disabled={loading || discordLoading}
                >
                  {discordLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Discord
                    </>
                  )}
                </Button>
              </>
            )}
            
            <div className="text-center space-y-2">
              <div className="text-xs text-slate-400">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </div>
              <div className="text-sm text-slate-300">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}
