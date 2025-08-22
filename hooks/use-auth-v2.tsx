"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import authFlowV2, { AuthState, AuthFlowResult } from '@/lib/auth-flow-v2'
import { useSession } from '@/hooks/use-session'
import { useToast } from '@/hooks/use-toast'
import { useSafeRedirect } from '@/lib/client-utils'
import { useAuthLoading } from '@/lib/global-loading-manager'
import { IdleTimer } from '@/components/session/idle-timer'
import { TokenRefresher } from '@/components/session/token-refresher'

interface AuthContextType extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<AuthFlowResult>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  
  // Agreement actions
  acceptAgreement: () => Promise<boolean>
  
  // Utility
  refreshProfile: () => Promise<void>
  updateProfile: (updatedProfile: any) => Promise<void>
  clearError: () => void
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to get the correct site URL for redirects
const getSiteUrl = () => {
  // In production, prioritize NEXT_PUBLIC_SITE_URL over VERCEL_URL to avoid subdomain issues
  let url = process.env.NEXT_PUBLIC_SITE_URL
  
  // Only use VERCEL_URL as fallback if no SITE_URL is set and we're not in development
  if (!url && process.env.NODE_ENV !== 'development') {
    url = process.env.NEXT_PUBLIC_VERCEL_URL
  }
  
  // Development fallback
  if (!url) {
    url = 'http://localhost:3000'
  }
  
  // Ensure URL has protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`
  }
  
  // Remove trailing slash
  url = url.endsWith('/') ? url.slice(0, -1) : url
  
  console.log('🔗 Site URL resolved to:', url)
  return url
}

const AuthProviderV2 = memo(function AuthProviderV2({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { toast } = useToast()
  const { safeRedirect } = useSafeRedirect()
  const session = useSession()
  const { startAuth, startProfile, startAgreement, startInitializing, completeAuth, errorAuth } = useAuthLoading()
  
  // Auth flow state
  const [authState, setAuthState] = useState<AuthState>(authFlowV2.getState())
  
  // Track pending redirect for instant redirect when auth completes
  const pendingRedirect = useRef<{ redirectPath: string; isFromAuthPage: boolean; isRequiredRedirect: boolean } | null>(null)
  const mounted = useRef(true)
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Track Supabase auth events
  useEffect(() => {
    console.log('🔗 Setting up Supabase auth listener...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (!mounted.current) return
      
      console.log(`🔄 Supabase AUTH EVENT: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 Supabase signed out event')
          // Don't redirect here - let the signOut function handle it
          return
        }
        
        if (event === 'SIGNED_IN' && supabaseSession) {
          console.log('✅ Supabase signed in event')
          const provider = supabaseSession.user.app_metadata?.provider || 'email'
          console.log(`🔐 Sign in via ${provider}`)
          
          // Handle the session through auth flow
          const result = await authFlowV2.handleSupabaseSession(supabaseSession)
          
          if (!mounted.current) return
          
          // UNIFIED REDIRECT LOGIC: Both email and Discord use the same flow
          if (result.success) {
            console.log(`🔄 ${provider} authentication complete, triggering unified redirect`)
            
            // Set pending redirect for immediate handling when profile loads
            pendingRedirect.current = {
              redirectPath: result.redirectPath || '/dashboard',
              isFromAuthPage: true,
              isRequiredRedirect: true
            }
            
            // The redirect will be handled by the state change handler when profile is ready
            console.log('⏳ Redirect queued, waiting for profile to load...')
          }
        }
      } catch (error: any) {
        console.error('❌ Auth event error:', error)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [safeRedirect])

  // Subscribe to auth flow state changes
  useEffect(() => {
    if (!mounted.current) return
    
    const unsubscribe = authFlowV2.subscribe((newState) => {
      if (!mounted.current) return
      
      console.log('🔄 Auth hook: State update received:', {
        isAuthenticated: newState.isAuthenticated,
        isInitialized: newState.isInitialized,
        isLoading: newState.isLoading,
        hasProfile: !!newState.profile,
        error: newState.error
      })
      
      setAuthState(newState)
      
      // Handle redirects when auth state changes
      if (newState.isAuthenticated && !newState.isLoading && newState.profile) {
        // User is fully authenticated and profile is loaded
        if (pendingRedirect.current && pendingRedirect.current.redirectPath) {
          const { redirectPath } = pendingRedirect.current
          console.log('⚡ Auth complete, redirecting to:', redirectPath)
          
          // Immediate redirect for better UX
          setTimeout(() => {
            if (mounted.current) {
              safeRedirect(redirectPath, { delay: 100 })
              pendingRedirect.current = null
            }
          }, 100)
        } else {
          // Note: Redirect logic has been moved to usePostAuthRedirect hook
          // This ensures consistent behavior across all pages and components
          console.log('🔄 Auth state updated - redirect handled by usePostAuthRedirect hook')
        }
      }
      
      // Clear loading state if auth is complete
      if (!newState.isLoading && newState.isInitialized) {
        console.log('✅ Auth initialization complete')
      }
    })
    
    return unsubscribe
  }, [safeRedirect])

  // Handle instant redirect when authentication is complete
  useEffect(() => {
    if (!mounted.current) return

    // Check if we should trigger an instant redirect after authentication completes
    if (authState.isAuthenticated && !authState.isLoading && authState.profile && pendingRedirect.current) {
      const { redirectPath, isFromAuthPage, isRequiredRedirect } = pendingRedirect.current
      const currentPath = window.location.pathname

      console.log('🚀 Authentication complete! Profile ready, triggering instant redirect to:', redirectPath)
      
      // Clear any existing redirect timeout
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }

      // Don't redirect if already on the target page
      if (currentPath !== redirectPath) {
        console.log('⚡ Instant redirect to:', redirectPath)
        
        // Small delay to coordinate with login animation
        setTimeout(() => {
          if (mounted.current) {
            safeRedirect(redirectPath)
          }
        }, 1600) // Slightly after login animation completes
      } else {
        console.log('🔄 Already on target page, skipping redirect')
      }

      // Clear the pending redirect
      pendingRedirect.current = null
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.profile, router])

  // Initialize auth flow on mount
  useEffect(() => {
    let initTimeout: NodeJS.Timeout | null = null
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 Auth hook: Checking if initialization needed...')
        
        // Don't initialize if route guard is handling it
        // Route guard will initialize for protected routes
        const currentPath = window.location.pathname
        const isPublicRoute = ['/', '/auth/login', '/auth/signup', '/auth/confirm', '/auth/forgot', '/auth/reset-password'].some(route => {
          if (route === '/') return currentPath === '/'
          return currentPath.startsWith(route)
        })
        
        if (isPublicRoute) {
          console.log('🏠 Auth hook: On public route, letting route guard handle auth initialization')
          return
        }
        
        // Only initialize for protected routes if not already initialized
        const currentState = authFlowV2.getState()
        if (currentState.isInitialized && !currentState.isLoading) {
          console.log('✅ Auth hook: Already initialized, skipping')
          return
        }
        
        console.log('🚀 Auth hook: Performing initialization...')
        const result = await authFlowV2.initialize(false)
        
        if (!mounted.current) return
        
        // Only redirect if explicitly needed and not on a public route
        if (result.success && result.shouldRedirect && result.redirectPath) {
          const currentPath = window.location.pathname
          
          if (currentPath !== result.redirectPath) {
            console.log('🔄 Auth hook: Redirecting to:', result.redirectPath)
            
            initTimeout = setTimeout(() => {
              if (mounted.current) {
                safeRedirect(result.redirectPath!, { delay: 1000 })
              }
            }, 1000)
          }
        }
      } catch (error: any) {
        console.error('❌ Auth hook initialization error:', error)
        if (mounted.current) {
          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize authentication',
            variant: 'destructive'
          })
        }
      }
    }

    // Only initialize once on mount, not on every dependency change
    const delayedInit = setTimeout(() => {
      if (mounted.current) {
        initializeAuth()
      }
    }, 100)
    
    return () => {
      mounted.current = false
      clearTimeout(delayedInit)
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Sign in function
  const signIn = useCallback(async (email: string, password: string): Promise<AuthFlowResult> => {
    try {
      console.log('🔐 Sign in attempt:', email)
      
      // Clear any pending redirects to prevent conflicts
      if (pendingRedirect.current) {
        pendingRedirect.current = null
      }
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
      
      const result = await authFlowV2.signIn(email, password)
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.'
        })
        
        // Don't redirect immediately - let the auth state listener handle it
        // This prevents the brief redirect to login page
        console.log('🔄 Sign in successful, auth state listener will handle redirect')
      } else if (result.error) {
        toast({
          title: 'Sign In Failed',
          description: result.error,
          variant: 'destructive'
        })
      }
      
      return result
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed'
      toast({
        title: 'Sign In Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return { success: false, shouldRedirect: false, error: errorMessage }
    }
  }, [toast])

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ error: any | null }> => {
    try {
      console.log('🔐 Sign up attempt:', email)

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })

      if (signUpError) {
        console.error('❌ Sign up failed:', signUpError.message)
        toast({
          title: 'Sign Up Failed',
          description: signUpError.message,
          variant: 'destructive'
        })
        return { error: signUpError }
      }

      console.log('✅ Sign up successful - check email')
      toast({
        title: 'Check Your Email',
        description: 'We\'ve sent you a confirmation link to complete your registration.'
      })
      
      return { error: null }

    } catch (err: any) {
      console.error('❌ Sign up exception:', err)
      toast({
        title: 'Sign Up Error',
        description: err.message || 'Sign up failed',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [toast])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...')
      
      // Clear any pending redirects
      if (pendingRedirect.current) {
        pendingRedirect.current = null
      }
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
      
      // Clear auth state first to prevent any race conditions
      await authFlowV2.signOut()
      
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.'
      })
      
      // Redirect to homepage immediately to avoid flicker
      console.log('🏠 Redirecting to homepage after sign out')
      safeRedirect('/')
      
    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      toast({
        title: 'Sign Out Error',
        description: 'There was an issue signing out',
        variant: 'destructive'
      })
      
      // Still try to redirect to homepage even if there was an error
      setTimeout(() => {
        safeRedirect('/', { delay: 500 })
      }, 500)
    }
  }, [safeRedirect, toast])

  // Discord sign in
  const signInWithDiscord = useCallback(async () => {
    try {
      console.log('🔐 Discord sign in attempt')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${getSiteUrl()}/auth/confirm`
        }
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('❌ Discord sign in error:', error)
      toast({
        title: 'Discord Sign In Failed',
        description: error.message || 'Failed to sign in with Discord',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`
      })

      if (error) {
        toast({
          title: 'Reset Failed',
          description: error.message,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Check Your Email',
          description: 'We\'ve sent you a password reset link.'
        })
      }

      return { error }
    } catch (err: any) {
      toast({
        title: 'Reset Error',
        description: err.message || 'Password reset failed',
        variant: 'destructive'
      })
      return { error: err }
    }
  }, [toast])

  // Accept agreement
  const acceptAgreement = useCallback(async (): Promise<boolean> => {
    try {
      const success = await authFlowV2.acceptAgreement()
      
      if (success) {
        toast({
          title: 'Agreement Accepted',
          description: 'You can now access the full application.'
        })
      } else {
        toast({
          title: 'Agreement Error',
          description: 'Failed to accept the agreement. Please try again.',
          variant: 'destructive'
        })
      }
      
      return success
    } catch (error: any) {
      console.error('❌ Agreement acceptance error:', error)
      toast({
        title: 'Agreement Error',
        description: error.message || 'Failed to accept agreement',
        variant: 'destructive'
      })
      return false
    }
  }, [toast])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    try {
      console.log('🔄 Auth hook: Refreshing profile data...')
      
      // Use dedicated refresh method to avoid full initialization
      await authFlowV2.refreshProfile()
      
      console.log('✅ Auth hook: Profile refresh completed')
    } catch (error: any) {
      console.error('❌ Auth hook: Profile refresh error:', error)
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh profile',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Update profile without full re-initialization
  const updateProfile = useCallback(async (updatedProfile: any) => {
    try {
      await authFlowV2.updateProfile(updatedProfile)
    } catch (error: any) {
      console.error('❌ Profile update error:', error)
      toast({
        title: 'Update Error',
        description: 'Failed to update profile data',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Clear error
  const clearError = useCallback(() => {
    // The auth flow manager will handle error clearing in its state
  }, [])

  // Get access token
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }, [])

  // Handle logout from session management
  const handleSessionLogout = useCallback(() => {
    signOut()
  }, [signOut])

  const contextValue: AuthContextType = {
    // Auth flow state
    ...authState,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    signInWithDiscord,
    resetPassword,
    
    // Agreement actions
    acceptAgreement,
    
    // Utility
    refreshProfile,
    updateProfile,
    clearError,
    getToken
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Session management components - only if authenticated */}
      {authState.isAuthenticated && (
        <>
          <IdleTimer onLogout={handleSessionLogout} />
          <TokenRefresher onTokenExpired={handleSessionLogout} />
        </>
      )}
    </AuthContext.Provider>
  )
})

export function useAuthV2() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthV2 must be used within an AuthProviderV2')
  }
  return context
}

export { AuthProviderV2 }