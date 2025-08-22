"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { usePostAuthRedirect } from "@/hooks/use-post-auth-redirect"
import { usePageLoading } from "@/lib/global-loading-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, isLoading } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [authProgress, setAuthProgress] = useState('Initializing...')
  const [hasRedirected, setHasRedirected] = useState(false)
  
  // Use unified post-auth redirect hook
  const { isRedirecting } = usePostAuthRedirect({
    redirectFromPages: ['/auth/confirm'],
    redirectDelay: 200 // Slightly longer delay for OAuth flows
  })

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected) return

    // Simple redirect logic for authenticated users
    if (user && profile && !isLoading) {
      console.log('✅ Auth confirmation: User authenticated, redirecting')
      setHasRedirected(true)
      
      // Determine redirect path
      let redirectPath = '/dashboard'
      if (profile.role === 'pending_player' && !profile.onboarding_completed) {
        redirectPath = '/onboarding'
        console.log('🔄 New user needs onboarding')
      }
      
      console.log(`🚀 Auth confirm: Redirecting to ${redirectPath}`)
      setTimeout(() => {
        router.replace(redirectPath)
      }, 1000) // 1 second delay to show the success state
      return
    }

    // Handle OAuth flow (no token_hash parameter)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const isOAuthFlow = !tokenHash && !type

    if (isOAuthFlow && !user) {
      console.log('🔐 OAuth flow detected, waiting for auth...')
      setAuthProgress('Processing authentication...')
      
      // Simple timeout - if no auth after 10 seconds, go home
      const timeoutId = setTimeout(() => {
        if (!hasRedirected && !user) {
          console.log('⚠️ Auth timeout, redirecting to homepage')
          setAuthProgress('Redirecting...')
          router.replace('/')
        }
      }, 10000) // 10 second timeout
      
      return () => clearTimeout(timeoutId)
    }

    // Handle email confirmation flow if not OAuth
    if (tokenHash && type === 'signup') {
      handleAuthConfirmation()
    }
  }, [searchParams, router, toast, user, profile, isLoading, hasRedirected])

  // Handle email confirmation flow
  const handleAuthConfirmation = async () => {
    try {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      
      if (!tokenHash || type !== 'signup') {
        throw new Error('Invalid confirmation link')
      }

      // Verify the token with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup'
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setStatus('success')
        setMessage('Email confirmed successfully! You can now login.')
        toast({
          title: 'Verification complete',
          description: 'You can login now.',
          variant: 'default',
        })
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } else {
        throw new Error('No user data returned')
      }

    } catch (error: any) {
      console.error('Email confirmation error:', error)
      setStatus('error')
      setMessage(error.message || 'Failed to confirm email. The link may be expired or invalid.')
    }
  }

  // Aggressive session check for OAuth flows
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const isOAuthFlow = !tokenHash && !type

    if (isOAuthFlow && !user) {
      console.log('🔍 Auth confirm: Checking for immediate OAuth session...')
      
      // Check for session immediately
      const checkSession = async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (session?.user && !error) {
            console.log('✅ Auth confirm: Found immediate OAuth session, forcing auth refresh')
            // Force auth state refresh
            window.location.reload()
          }
        } catch (error) {
          console.error('❌ Auth confirm: Session check error:', error)
        }
      }

      // Check immediately and after delay
      checkSession()
      const timeoutId = setTimeout(checkSession, 1000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchParams, user])

  // For OAuth flows, show a different message
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const isOAuthFlow = !tokenHash && !type

  const { startPageLoad, completePageLoad } = usePageLoading()
  
  useEffect(() => {
    if (isLoading || (user && !profile) || isRedirecting) {
      startPageLoad('auth-confirm')
    } else {
      completePageLoad('auth-confirm')
    }
  }, [isLoading, user, profile, isRedirecting, startPageLoad, completePageLoad])

  if (isLoading || (user && !profile)) {
    return null // Global loading will handle this
  }
  
  // Show redirecting state
  if (isRedirecting) {
    return null // Global loading will handle this
  }

  // For OAuth flows, show a simpler loading state
  if (isOAuthFlow) {
    return (
      <VideoBackground>
        <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
        <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
        
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 esports-heading text-2xl text-white font-semibold">
                <Loader2 className="h-5 w-5 animate-spin" />
                Authentication
              </CardTitle>
              <CardDescription className="text-slate-200">
                {authProgress}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-slate-300">{authProgress}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {user ? 'User authenticated ✓' : 'Waiting for authentication...'}
                  {user && profile && ' | Profile loaded ✓'}
                </div>
              </div>
            </CardContent>
          </Card>
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
            <CardTitle className="flex items-center justify-center gap-2 esports-heading text-2xl text-white font-semibold">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
              Email Confirmation
            </CardTitle>
            <CardDescription className="text-slate-200">
              {status === 'loading' && 'Verifying your email...'}
              {status === 'success' && 'Your email has been confirmed!'}
              {status === 'error' && 'Confirmation failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'loading' && (
              <div className="text-center">
                <p className="text-slate-300">Please wait while we verify your email address.</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <Alert className="bg-green-500/10 border-green-500/20 text-green-100">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-slate-300 mb-4">
                    Redirecting to home page in 3 seconds...
                  </p>
                  <Button asChild className={`w-full ${getButtonStyle('primary')}`}>
                    <Link href="/">Go to Home</Link>
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert className="bg-red-500/10 border-red-500/20 text-red-100">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 gap-2">
                  <Button asChild variant="outline" className={`w-full ${getButtonStyle('outline')}`}>
                    <Link href="/auth/signup">Try Signup Again</Link>
                  </Button>
                  <Button asChild className={`w-full ${getButtonStyle('primary')}`}>
                    <Link href="/auth/login">Go to Login</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl relative z-20">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <PublicFooter />
        </div>
      </VideoBackground>
    }>
      <AuthConfirmContent />
    </Suspense>
  )
}