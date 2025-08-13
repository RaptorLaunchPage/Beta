"use client"

import { useEffect, useRef } from 'react'
import { useSession } from '@/hooks/use-session'
import SessionStorage from '@/lib/session-storage'
import { useToast } from '@/hooks/use-toast'

interface TokenRefresherProps {
  onTokenExpired: () => void
}

export function TokenRefresher({ onTokenExpired }: TokenRefresherProps) {
  const { isAuthenticated, tokenInfo, refreshToken } = useSession()
  const { toast } = useToast()
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const config = SessionStorage.getConfig()

  // Calculate when to refresh token (10 minutes before expiry or every 10 minutes)
  const getRefreshInterval = () => {
    if (!tokenInfo) return config.REFRESH_INTERVAL

    const timeUntilExpiry = tokenInfo.expiresAt - Date.now()
    const refreshBefore = 10 * 60 * 1000 // 10 minutes before expiry
    
    if (timeUntilExpiry > refreshBefore) {
      return Math.min(config.REFRESH_INTERVAL, timeUntilExpiry - refreshBefore)
    }
    
    return 30 * 1000 // Try every 30 seconds if close to expiry
  }

  // Refresh token periodically
  const scheduleTokenRefresh = () => {
    if (refreshIntervalRef.current) {
      clearTimeout(refreshIntervalRef.current)
    }

    if (!isAuthenticated) return

    const interval = getRefreshInterval()
    
    refreshIntervalRef.current = setTimeout(async () => {
      console.log('🔄 Scheduled token refresh...')
      
      try {
        const success = await refreshToken()
        
        if (success) {
          console.log('✅ Token refreshed successfully')
          // Schedule next refresh
          scheduleTokenRefresh()
        } else {
          console.error('❌ Token refresh failed - session expired')
          toast({
            title: "Session Expired",
            description: "Please login again",
            variant: "destructive"
          })
          onTokenExpired()
        }
      } catch (error) {
        console.error('Token refresh error:', error)
        onTokenExpired()
      }
    }, interval)

    console.log(`⏰ Next token refresh scheduled in ${Math.round(interval / 1000 / 60)} minutes`)
  }

  // Set up token refresh schedule
  useEffect(() => {
    if (isAuthenticated && tokenInfo) {
      scheduleTokenRefresh()
    } else {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current)
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current)
      }
    }
  }, [isAuthenticated, tokenInfo])

  // Check for immediate expiry on mount
  useEffect(() => {
    if (isAuthenticated && tokenInfo) {
      const timeUntilExpiry = tokenInfo.expiresAt - Date.now()
      
      if (timeUntilExpiry <= 0) {
        console.log('⚠️ Token already expired on mount')
        onTokenExpired()
      } else if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
        console.log('⚠️ Token expires soon, refreshing immediately')
        refreshToken().then(success => {
          if (!success) {
            onTokenExpired()
          }
        })
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current)
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}
