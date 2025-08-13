"use client"

import type React from "react"
import { useState } from "react"
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
import { Eye, EyeOff, LogIn, RefreshCw, Home, Shield } from "lucide-react"
import { COMPONENT_STYLES, getButtonStyle } from "@/lib/global-theme"
import { useRouter, usePathname } from "next/navigation"
import { useManualRedirect } from "@/hooks/use-post-auth-redirect"

export default function LoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLoginAnimation, setShowLoginAnimation] = useState(false)
  const { signIn, signInWithDiscord, isAuthenticated, error } = useAuth()
  const { triggerRedirect, canRedirect } = useManualRedirect()
  
  // Use unified post-auth redirect hook
  usePostAuthRedirect({
    redirectFromPages: ['/auth/login'],
    redirectDelay: 100
  })

  // If already authenticated, the unified redirect hook will handle redirect

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("🔐 Login form submission started")
    
    if (!email.trim() || !password.trim()) {
      return
    }

    if (isSubmitting) {
      console.log("❌ Already submitting, ignoring")
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await signIn(email, password)
      
      if (result.success) {
        console.log("✅ Login successful, showing brief success animation")
        setShowLoginAnimation(true)
        
        // Show animation briefly then let auth hook handle redirect
        setTimeout(() => {
          console.log("🔄 Login animation complete, auth hook will handle redirect")
          // Don't manually redirect - let the auth hook handle it
        }, 1500) // Brief animation duration
        // Mobile-safe fallback: if still on login and authenticated after ~2.2s, force a redirect
        setTimeout(() => {
          try {
            if (typeof window !== 'undefined') {
              const stillOnAuth = window.location.pathname.startsWith('/auth')
              if (stillOnAuth && isAuthenticated) {
                if (canRedirect) {
                  console.log('⚡ Fallback redirect: using manual profile-based target')
                  triggerRedirect()
                } else {
                  console.log('⚡ Fallback redirect: defaulting to /dashboard')
                  router.replace('/dashboard')
                }
              }
            }
          } catch {}
        }, 2200)
      } else {
        // Error case - make sure to reset submitting state
        setIsSubmitting(false)
      }
      // Navigation and error handling done by auth flow
    } catch (err: any) {
      console.error("❌ Login form exception:", err)
      setIsSubmitting(false)
    }
  }

  const handleDiscordLogin = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      await signInWithDiscord()
      // Discord OAuth will redirect externally, so we don't need to handle success here
      // The redirect will happen automatically
    } catch (err: any) {
      console.error("Discord login error:", err)
      setIsSubmitting(false)
    }
  }

  // If already authenticated, route guard will handle redirect

  // Show loading animation during successful login
  if (showLoginAnimation) {
    return (
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className={`w-full max-w-md ${COMPONENT_STYLES.authCard}`}>
              <CardContent className="text-center py-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <Shield className="h-16 w-16 text-white animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Welcome Back!</h3>
                    <p className="text-slate-200">Taking you to your dashboard...</p>
                  </div>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
          {/* Ambient glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          
          <div className="w-full max-w-md">
        <Card className={`w-full max-w-md ${COMPONENT_STYLES.authCard}`}>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-200">
              Sign in to your Raptor Esports account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700/50 backdrop-blur-sm">
                <AlertDescription className="text-sm text-red-100">
                  {error}
                  {error.includes("invalid") && (
                    <div className="mt-2 text-xs">
                      <p>• Check your email and password spelling</p>
                      <p>• Make sure Caps Lock is off</p>
                      <p>• Try resetting your password if needed</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Link 
                  href="/auth/forgot" 
                  className="text-sm text-slate-300 hover:text-white underline"
                >
                  Forgot password?
                </Link>
              </div>
              
              <Button 
                type="submit" 
                className={`w-full ${getButtonStyle('primary')}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
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
                  onClick={handleDiscordLogin}
                  variant="outline" 
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2] font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  )}
                  Continue with Discord
                </Button>
              </>
            )}
            
            <div className="text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-white hover:underline font-medium">
                Sign up
              </Link>
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
