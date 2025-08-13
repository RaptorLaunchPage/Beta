import { useState, useEffect, useCallback } from 'react'
import SessionStorage, { SessionData, TokenInfo } from '@/lib/session-storage'
import { supabase } from '@/lib/supabase'

export interface SessionState {
  user: SessionData['user'] | null
  isAuthenticated: boolean
  isExpired: boolean
  lastActive: number
  tokenInfo: TokenInfo | null
  loading: boolean
  error: string | null
}

export interface SessionActions {
  refreshToken: () => Promise<boolean>
  updateLastActive: () => void
  clearSession: () => void
  initializeSession: (sessionData: SessionData) => void
  updateSession: (updates: Partial<SessionData>) => void
}

export function useSession(): SessionState & SessionActions {
  const [state, setState] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isExpired: false,
    lastActive: 0,
    tokenInfo: null,
    loading: true,
    error: null
  })

  // Initialize session from storage
  useEffect(() => {
    const initializeFromStorage = () => {
      try {
        const session = SessionStorage.getSession()
        const accessToken = SessionStorage.getAccessToken()
        
        if (session && accessToken) {
          setState(prev => ({
            ...prev,
            user: session.user,
            isAuthenticated: true,
            isExpired: SessionStorage.isTokenExpired(),
            lastActive: session.lastActive,
            tokenInfo: session.tokenInfo,
            loading: false
          }))
        } else {
          setState(prev => ({
            ...prev,
            loading: false
          }))
        }
      } catch (error) {
        console.error('Failed to initialize session:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize session'
        }))
      }
    }

    initializeFromStorage()
  }, [])

  // Refresh access token using Supabase
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing access token...')
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error || !data.session) {
        console.error('Token refresh failed:', error)
        setState(prev => ({
          ...prev,
          isExpired: true,
          error: 'Session expired'
        }))
        return false
      }

      // Update session with new token
      const newTokenInfo: TokenInfo = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: Date.now() + (data.session.expires_in * 1000),
        issuedAt: Date.now(),
        userId: data.session.user.id
      }

      SessionStorage.setAccessToken(data.session.access_token)
      
      setState(prev => ({
        ...prev,
        tokenInfo: newTokenInfo,
        isExpired: false,
        error: null
      }))

      console.log('✅ Token refreshed successfully')
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      setState(prev => ({
        ...prev,
        isExpired: true,
        error: 'Failed to refresh token'
      }))
      return false
    }
  }, [])

  // Update last active timestamp
  const updateLastActive = useCallback(() => {
    SessionStorage.updateLastActive()
    setState(prev => ({
      ...prev,
      lastActive: Date.now()
    }))
  }, [])

  // Clear session
  const clearSession = useCallback(() => {
    SessionStorage.clearSession()
    setState({
      user: null,
      isAuthenticated: false,
      isExpired: false,
      lastActive: 0,
      tokenInfo: null,
      loading: false,
      error: null
    })
  }, [])

  // Initialize session with new data
  const initializeSession = useCallback((sessionData: SessionData) => {
    SessionStorage.setSession(sessionData)
    setState({
      user: sessionData.user,
      isAuthenticated: true,
      isExpired: false,
      lastActive: sessionData.lastActive,
      tokenInfo: sessionData.tokenInfo,
      loading: false,
      error: null
    })
  }, [])

  // Update session partially
  const updateSession = useCallback((updates: Partial<SessionData>) => {
    SessionStorage.updateSession(updates)
    setState(prev => ({
      ...prev,
      ...updates,
      user: updates.user || prev.user,
      lastActive: updates.lastActive || prev.lastActive,
      tokenInfo: updates.tokenInfo || prev.tokenInfo
    }))
  }, [])

  return {
    ...state,
    refreshToken,
    updateLastActive,
    clearSession,
    initializeSession,
    updateSession
  }
}
