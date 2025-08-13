// Session Storage Utility - Secure token management
export interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  issuedAt: number
  userId: string
}

export interface SessionData {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  tokenInfo: TokenInfo
  lastActive: number
  agreementAccepted: boolean
  profileLoadedOnce?: boolean // ✅ New flag to track profile loading
}

class SessionStorage {
  private static readonly ACCESS_TOKEN_KEY = 'raptor-access-token'
  private static readonly SESSION_DATA_KEY = 'raptor-session-data'
  private static readonly LAST_ACTIVE_KEY = 'raptor-last-active'
  
  // In-memory storage for sensitive data
  private static inMemorySession: SessionData | null = null
  private static inMemoryAccessToken: string | null = null

  /**
   * Set session data securely
   * Access token in memory, refresh token in httpOnly cookie (if available)
   */
  static setSession(sessionData: SessionData): void {
    try {
      // Store in memory for immediate access
      this.inMemorySession = sessionData
      this.inMemoryAccessToken = sessionData.tokenInfo.accessToken

      // Store minimal data in localStorage (encrypted if possible)
      const storageData = {
        user: sessionData.user,
        lastActive: sessionData.lastActive,
        agreementAccepted: sessionData.agreementAccepted,
        lastRoute: (sessionData as any).lastRoute || '/dashboard',
        tokenExpiry: sessionData.tokenInfo.expiresAt,
        userId: sessionData.tokenInfo.userId
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.SESSION_DATA_KEY, JSON.stringify(storageData))
        localStorage.setItem(this.LAST_ACTIVE_KEY, sessionData.lastActive.toString())
      }

      console.log('🔐 Session stored securely')
    } catch (error) {
      console.error('Failed to store session:', error)
    }
  }

  /**
   * Get current session data
   */
  static getSession(): SessionData | null {
    try {
      // Return in-memory session if available
      if (this.inMemorySession) {
        return this.inMemorySession
      }

      // Try to restore from localStorage
      if (typeof window !== 'undefined') {
        const storedData = localStorage.getItem(this.SESSION_DATA_KEY)
        if (storedData) {
          const parsed = JSON.parse(storedData)
          
          // Check if session is expired
          if (parsed.tokenExpiry && Date.now() > parsed.tokenExpiry) {
            this.clearSession()
            return null
          }

          // Reconstruct session data (without access token)
          return {
            user: parsed.user,
            tokenInfo: {
              accessToken: '', // Will be refreshed
              expiresAt: parsed.tokenExpiry,
              issuedAt: Date.now(),
              userId: parsed.userId
            },
            lastActive: parsed.lastActive,
            agreementAccepted: parsed.agreementAccepted,
            // lastRoute removed from interface
          }
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  /**
   * Get access token (from memory or refresh)
   */
  static getAccessToken(): string | null {
    return this.inMemoryAccessToken
  }

  /**
   * Update access token in memory
   */
  static setAccessToken(token: string): void {
    this.inMemoryAccessToken = token
    
    // Update session with new token
    if (this.inMemorySession) {
      this.inMemorySession.tokenInfo.accessToken = token
      this.inMemorySession.tokenInfo.issuedAt = Date.now()
    }
  }

  /**
   * Update last active timestamp
   */
  static updateLastActive(): void {
    const now = Date.now()
    
    if (this.inMemorySession) {
      this.inMemorySession.lastActive = now
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.LAST_ACTIVE_KEY, now.toString())
    }
  }

  /**
   * Get last active timestamp
   */
  static getLastActive(): number {
    if (this.inMemorySession) {
      return this.inMemorySession.lastActive
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.LAST_ACTIVE_KEY)
      return stored ? parseInt(stored, 10) : 0
    }

    return 0
  }

  /**
   * Check if session is expired based on inactivity
   */
  static isInactive(inactivityTimeoutMs: number = 60 * 60 * 1000): boolean {
    const lastActive = this.getLastActive()
    if (!lastActive) return true
    
    return Date.now() - lastActive > inactivityTimeoutMs
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(): boolean {
    const session = this.getSession()
    if (!session) return true
    
    return Date.now() > session.tokenInfo.expiresAt
  }

  /**
   * Clear all session data
   */
  static clearSession(): void {
    try {
      // Clear in-memory data
      this.inMemorySession = null
      this.inMemoryAccessToken = null

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.SESSION_DATA_KEY)
        localStorage.removeItem(this.ACCESS_TOKEN_KEY)
        localStorage.removeItem(this.LAST_ACTIVE_KEY)
        
        // Clear any other auth-related items
        localStorage.removeItem('raptor-auth-token')
      }

      console.log('🧹 Session cleared')
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  /**
   * Update session data partially
   */
  static updateSession(updates: Partial<SessionData>): void {
    if (this.inMemorySession) {
      this.inMemorySession = { ...this.inMemorySession, ...updates }
      
      // Update localStorage with new data
      this.setSession(this.inMemorySession)
    }
  }

  /**
   * Get session configuration
   */
  static getConfig() {
    // Import here to avoid circular dependencies
    const SESSION_CONFIG = require('./session-config').default
    return SESSION_CONFIG
  }
}

export default SessionStorage
