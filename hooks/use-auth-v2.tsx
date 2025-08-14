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
  let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url.slice(0, -1) : url
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
            console.log(`🔄 ${provider} authentication complete`)
            // Do not set a pending redirect here; post-auth hook handles it to avoid double routing
          }
        }
      } catch (error: any) {
        console.error('❌ Auth event error:', error)
      }
    })

    // Immediately process existing session in case the SIGNED_IN event was missed
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('🔍 Found existing session on mount, processing it now...')
          await authFlowV2.handleSupabaseSession(session)
        }
      } catch (e) {
        console.warn('⚠️ Initial session check failed:', e)
      }
    })()

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

  // Remove instant redirect block; usePostAuthRedirect centrally manages redirects to avoid flicker

  // Initialize auth flow on mount is fully handled by RouteGuardV2 to avoid double init flicker
  useEffect(() => {
    let cancelled = false
    console.log('ℹ️ Auth hook: Skipping local initialization; RouteGuardV2 manages it')
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [])

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