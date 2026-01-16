import { supabase } from '@/lib/supabase'
import { SecureProfileCreation } from '@/lib/secure-profile-creation'
import SessionStorage, { SessionData, TokenInfo } from '@/lib/session-storage'
import GlobalLoadingManager from '@/lib/global-loading-manager'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  user: SessionData['user'] | null
  profile: any
  agreementStatus: {
    requiresAgreement: boolean
    isChecked: boolean
    status?: 'bypassed'
    current_version?: number
    required_version?: number
  }
  error: string | null
}

export interface AuthFlowResult {
  success: boolean
  shouldRedirect: boolean
  redirectPath?: string
  error?: string
}

class AuthFlowV2Manager {
  private static instance: AuthFlowV2Manager
  private state: AuthState = {
    isAuthenticated: false,
    isInitialized: false,
    isLoading: true,
    user: null,
    profile: null,
    agreementStatus: {
      requiresAgreement: false,
      isChecked: false
    },
    error: null
  }
  private listeners: Set<(state: AuthState) => void> = new Set()
  private profileCache: Map<string, any> = new Map()
  private initPromise: Promise<AuthFlowResult> | null = null
  private stateUpdateTimeout: NodeJS.Timeout | null = null
  private loadingManager = GlobalLoadingManager.getInstance()
  private sessionValidationCache: Map<string, { isValid: boolean; timestamp: number }> = new Map()

  static getInstance(): AuthFlowV2Manager {
    if (!AuthFlowV2Manager.instance) {
      AuthFlowV2Manager.instance = new AuthFlowV2Manager()
    }
    return AuthFlowV2Manager.instance
  }

  private constructor() {}

  // Subscribe to state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state }
  }

  // Update state and notify listeners with debouncing
  private setState(updates: Partial<AuthState>) {
    // Clear any existing timeout
    if (this.stateUpdateTimeout) {
      clearTimeout(this.stateUpdateTimeout)
    }
    
    // Debounce state updates to prevent rapid changes
    this.stateUpdateTimeout = setTimeout(() => {
      this.state = { ...this.state, ...updates }
      this.listeners.forEach(listener => listener(this.state))
    }, 50) // 50ms debounce
  }

  // Initialize authentication - always fast and reliable
  async initialize(isInitialLoad: boolean = true): Promise<AuthFlowResult> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise
    }

    // Check session cache for quick validation
    const cachedSession = SessionStorage.getSession()
    if (cachedSession && !isInitialLoad) {
      const cacheKey = cachedSession.user.id
      const cached = this.sessionValidationCache.get(cacheKey)
      const cacheAge = Date.now() - (cached?.timestamp || 0)
      
      // Use cache if less than 30 seconds old
      if (cached && cacheAge < 30000) {
        if (cached.isValid && this.state.isAuthenticated) {
          return { success: true, shouldRedirect: false }
        }
      }
    }

    // If already initialized and authenticated, return current state unless forcing reload
    if (this.state.isInitialized && this.state.isAuthenticated && !isInitialLoad) {
      return { 
        success: true, 
        shouldRedirect: false 
      }
    }

    // If initialized but not authenticated (signed out state), only reinitialize if explicitly requested
    if (this.state.isInitialized && !this.state.isAuthenticated && !isInitialLoad) {
      return { success: true, shouldRedirect: false }
    }

    // Start global loading
    this.loadingManager.startLoading('auth', 'connecting', {
      priority: 10,
      message: 'Establishing connection...',
      timeout: 15000
    })

    this.initPromise = this.performInitializeWithRetry(isInitialLoad)
    
    try {
      const result = await this.initPromise
      return result
    } finally {
      this.initPromise = null
      this.loadingManager.completeLoading('auth')
    }
  }

  // Retry mechanism for initialization
  private async performInitializeWithRetry(isInitialLoad: boolean, retryCount: number = 0): Promise<AuthFlowResult> {
    const maxRetries = 2
    
    try {
      return await this.performInitialize(isInitialLoad)
    } catch (error: any) {
      console.warn(`⚠️ Auth initialization attempt ${retryCount + 1} failed:`, error.message)
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying auth initialization (${retryCount + 1}/${maxRetries})...`)
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.performInitializeWithRetry(isInitialLoad, retryCount + 1)
      } else {
        console.error('❌ Auth initialization failed after all retries')
        // Return a safe fallback state
        this.setState({
          isInitialized: true,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          profile: null,
          agreementStatus: { requiresAgreement: false, isChecked: true },
          error: 'Authentication initialization failed after retries'
        })
        return { success: false, shouldRedirect: false, error: 'Authentication failed after retries' }
      }
    }
  }

  // Actual initialization logic - streamlined and fast
  private async performInitialize(isInitialLoad: boolean): Promise<AuthFlowResult> {
    try {
      this.setState({ isLoading: true, error: null })
      this.loadingManager.updateLoading('auth', { state: 'authenticating', message: 'Verifying credentials...' })

      // Add timeout wrapper for all async operations
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 2000): Promise<T> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        })
        return Promise.race([promise, timeoutPromise])
      }

      // Step 1: Check for existing session
      const existingSession = SessionStorage.getSession()
      const accessToken = SessionStorage.getAccessToken()

      if (existingSession && accessToken && !SessionStorage.isTokenExpired()) {
        // Try to restore user with cached profile if available
        const cachedProfile = this.profileCache.get(existingSession.user.id)
        if (cachedProfile) {
          // Cache session validation result
          this.sessionValidationCache.set(existingSession.user.id, {
            isValid: true,
            timestamp: Date.now()
          })
          return await this.setAuthenticatedState(existingSession, cachedProfile, false) // Don't redirect on restore
        }

        try {
          // Validate session with Supabase with timeout
          const { data: { user }, error } = await withTimeout(
            supabase.auth.getUser(accessToken),
            2000
          )
          
          if (user && !error) {
            this.loadingManager.updateLoading('auth', { state: 'loading-profile', message: 'Loading profile...' })
            
            // Load profile in parallel with timeout
            const profile = await withTimeout(
              this.loadUserProfileFast(user),
              2000
            )
            if (profile) {
              this.profileCache.set(user.id, profile)
              // Cache successful validation
              this.sessionValidationCache.set(user.id, {
                isValid: true,
                timestamp: Date.now()
              })
              return await this.setAuthenticatedState(existingSession, profile, false) // Don't redirect on restore
            }
          } else {
            // Cache failed validation
            if (existingSession.user.id) {
              this.sessionValidationCache.set(existingSession.user.id, {
                isValid: false,
                timestamp: Date.now()
              })
            }
            SessionStorage.clearSession()
            this.profileCache.clear()
          }
        } catch (timeoutError) {
          // Cache timeout as failed validation
          if (existingSession.user.id) {
            this.sessionValidationCache.set(existingSession.user.id, {
              isValid: false,
              timestamp: Date.now()
            })
          }
          SessionStorage.clearSession()
          this.profileCache.clear()
        }
      }

      // Step 2: Check for active Supabase session with timeout
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          3000
        )
        
        if (session?.user) {
          console.log('🔄 Active Supabase session found, processing...')
          return await this.handleSupabaseSession(session)
        }
      } catch (timeoutError) {
        console.warn('⚠️ Supabase session check timed out')
      }

      // Step 3: No active session
      console.log('📝 No active session found')
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true }
      })

      return { success: true, shouldRedirect: false }

    } catch (error: any) {
      console.error('❌ Auth initialization failed:', error)
      this.setState({
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Authentication initialization failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Fast profile loading with proper error handling
  private async loadUserProfileFast(user: User): Promise<any> {
    try {
      console.log(`🔍 Loading profile for user: ${user.email}`)

      // First, check users table (main profile storage)
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (userError && userError.code !== "PGRST116") {
        throw new Error(`User profile fetch failed: ${userError.message}`)
      }

      if (userProfile) {
        console.log('✅ User profile loaded successfully:', userProfile.role)
        return userProfile
      }

      // If no user profile, try profiles table
      const { data: legacyProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        console.log('⚠️ Legacy profile fetch error:', profileError.message)
      }

      // Create new profile if none exists
      console.log('🔧 Creating new user profile...')
      const provider = user.app_metadata?.provider || 'email'
      const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 'User'

      const profileResult = await SecureProfileCreation.createProfile(
        user.id,
        user.email || '',
        userName,
        provider
      )

      if (profileResult.success && profileResult.profile) {
        console.log('✅ New profile created successfully')
        return profileResult.profile
      } else {
        throw new Error(profileResult.error || 'Failed to create profile')
      }

    } catch (error: any) {
      console.error('❌ Profile loading error:', error)
      throw error
    }
  }

  // Set authenticated state with profile
  private async setAuthenticatedState(sessionData: SessionData, profile: any, shouldRedirect: boolean = false): Promise<AuthFlowResult> {
    try {
      // Check agreement status - skipped as module removed
      const agreementStatus = { requiresAgreement: false, isChecked: true, status: 'bypassed' } as const

      // Update auth state - ENSURE loading is false
      this.setState({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false, // Explicitly set to false
        user: sessionData.user,
        profile,
        agreementStatus,
        error: null
      })
      
      console.log('✅ Authentication state set successfully - isLoading: false')

      // Priority 1: Agreement requirements - Removed

      // Priority 2: Onboarding requirements (pending_player who hasn't completed onboarding)
      if (profile.role === 'pending_player' && !profile.onboarding_completed) {
        return {
          success: true,
          shouldRedirect: true,
          redirectPath: '/onboarding'
        }
      }

      // Priority 3: Redirect to appropriate page based on user state
      if (shouldRedirect) {
        // Check for intended route
        let redirectPath = '/dashboard'
        if (typeof window !== 'undefined') {
          const intendedRoute = localStorage.getItem('raptor-intended-route')
          if (intendedRoute && intendedRoute !== '/auth/login' && intendedRoute !== '/auth/signup') {
            redirectPath = intendedRoute
            localStorage.removeItem('raptor-intended-route')
          }
        }

        console.log(`🔄 Redirecting authenticated user to: ${redirectPath}`)
        return {
          success: true,
          shouldRedirect: true,
          redirectPath
        }
      }

      // For normal navigation/page refresh, don't redirect - just update state
      console.log('✅ Auth state updated, no redirect needed for normal navigation')
      return {
        success: true,
        shouldRedirect: false
      }

    } catch (error: any) {
      console.error('❌ Setting authenticated state failed:', error)
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Authentication state setup failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Handle Supabase session (login, token refresh, etc.)
  async handleSupabaseSession(session: Session): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Processing Supabase session...')
      
      const user = session.user
      const provider = user.app_metadata?.provider || 'email'
      
      console.log(`🔐 Processing ${provider} session for user:`, user.email)
      
      // Load user profile
      const profile = await this.loadUserProfileFast(user)
      if (!profile) {
        throw new Error('Failed to load user profile')
      }

      // Cache the profile
      this.profileCache.set(user.id, profile)

      // Create session data
      const tokenInfo: TokenInfo = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: Date.now() + (session.expires_in * 1000),
        issuedAt: Date.now(),
        userId: user.id
      }

      const sessionData: SessionData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: profile.name || profile.display_name || user.email?.split('@')[0],
          role: profile.role
        },
        tokenInfo,
        lastActive: Date.now(),
        agreementAccepted: false
      }

      // Store session
      SessionStorage.setSession(sessionData)

      console.log(`✅ ${provider} session processed successfully`)
      
      // Redirect only when on public/auth pages; on protected pages (hard refresh), avoid extra redirect
      let shouldRedirect = true
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        const redirectFrom = ['/', '/auth/login', '/auth/signup', '/auth/confirm', '/auth/forgot', '/auth/reset-password']
        if (!redirectFrom.includes(path)) {
          shouldRedirect = false
        }
      }
      return await this.setAuthenticatedState(sessionData, profile, shouldRedirect)

    } catch (error: any) {
      console.error('❌ Session handling failed:', error)
      SessionStorage.clearSession()
      this.profileCache.clear()
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Session processing failed'
      })
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Sign in
  async signIn(email: string, password: string): Promise<AuthFlowResult> {
    try {
      console.log('🔐 Auth flow: Sign in attempt')
      
      // Clear any pending state updates
      if (this.stateUpdateTimeout) {
        clearTimeout(this.stateUpdateTimeout)
        this.stateUpdateTimeout = null
      }
      
      this.setState({
        isLoading: true,
        error: null
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        this.setState({
          isLoading: false,
          error: error.message || 'Sign in failed'
        })
        this.loadingManager.completeLoading('auth', 'error', error.message)
        return { success: false, shouldRedirect: false, error: error.message }
      }

      if (!data.session) {
        console.error('❌ No session returned from sign in')
        this.setState({
          isLoading: false,
          error: 'Sign in failed - no session returned'
        })
        return { success: false, shouldRedirect: false, error: 'Sign in failed' }
      }

      console.log('✅ Sign in successful, processing session...')
      
      // Process the session through the auth flow
      const result = await this.handleSupabaseSession(data.session)
      
      // Clear loading state after processing
      this.setState({
        isLoading: false
      })
      
      // Also clear the global loading state
      this.loadingManager.completeLoading('auth')
      
      return result
    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      this.setState({
        isLoading: false,
        error: error.message || 'Sign in failed'
      })
      this.loadingManager.completeLoading('auth', 'error', error.message)
      return { success: false, shouldRedirect: false, error: error.message }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out user...')

      // Clear any pending state updates
      if (this.stateUpdateTimeout) {
        clearTimeout(this.stateUpdateTimeout)
        this.stateUpdateTimeout = null
      }

      // Clear local state first to prevent any race conditions
      SessionStorage.clearSession()
      this.profileCache.clear()
      
      // Set a clear signed-out state
      this.setState({
        isAuthenticated: false,
        isInitialized: true, // Keep initialized as true to prevent restarts
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: null
      })

      // Sign out from Supabase - do this after clearing local state
      // to prevent the SIGNED_OUT event from re-triggering signOut
      await supabase.auth.signOut()

      console.log('✅ Sign out complete - user fully logged out')

    } catch (error: any) {
      console.error('❌ Sign out error:', error)
      
      // Still ensure we're in a clean signed-out state even if Supabase fails
      this.setState({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        user: null,
        profile: null,
        agreementStatus: { requiresAgreement: false, isChecked: true },
        error: 'Sign out may have been incomplete'
      })
    }
  }

  // Accept agreement - Removed
  async acceptAgreement(): Promise<boolean> {
    return true
  }

  // Update profile
  async updateProfile(updatedProfile: any): Promise<void> {
    try {
      console.log('🔄 Updating profile data in auth state...')
      
      this.setState({
        profile: updatedProfile
      })

      // Update cache
      this.profileCache.set(updatedProfile.id, updatedProfile)

      // Update session storage
      const currentSession = SessionStorage.getSession()
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            name: updatedProfile.name || updatedProfile.display_name || currentSession.user.name,
            role: updatedProfile.role || currentSession.user.role
          }
        }
        SessionStorage.setSession(updatedSession)
      }

      console.log('✅ Profile updated successfully')
    } catch (error: any) {
      console.error('❌ Profile update error:', error)
      throw error
    }
  }

  // Refresh profile data without full re-initialization
  async refreshProfile(): Promise<void> {
    try {
      console.log('🔄 Refreshing profile data...')
      
      if (!this.state.isAuthenticated || !this.state.user) {
        throw new Error('Cannot refresh profile - not authenticated')
      }

      // Get fresh user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No active session found')
      }

      // Load fresh profile data
      const profile = await this.loadUserProfileFast(session.user)
      if (!profile) {
        throw new Error('Failed to load fresh profile data')
      }

      // Update state with fresh profile
      this.setState({
        profile
      })

      // Update cache
      this.profileCache.set(session.user.id, profile)

      console.log('✅ Profile refreshed successfully')
    } catch (error: any) {
      console.error('❌ Profile refresh error:', error)
      throw error
    }
  }
}

// Export singleton instance
const authFlowV2 = AuthFlowV2Manager.getInstance()
export default authFlowV2