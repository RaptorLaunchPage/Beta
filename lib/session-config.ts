// Session Management Configuration
export const SESSION_CONFIG = {
  // Session duration (12 hours by default)
  SESSION_DURATION: parseInt(process.env.NEXT_PUBLIC_SESSION_DURATION || '43200000'), // 12 hours in ms
  
  // Inactivity timeout (60 minutes by default)
  INACTIVITY_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT || '3600000'), // 60 minutes in ms
  
  // Token refresh interval (10 minutes by default)
  REFRESH_INTERVAL: parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '600000'), // 10 minutes in ms
  
  // Warning before logout (30 seconds by default)
  WARNING_BEFORE_LOGOUT: parseInt(process.env.NEXT_PUBLIC_WARNING_BEFORE_LOGOUT || '30000'), // 30 seconds in ms
  
  // Enable session management features
  ENABLE_IDLE_TIMER: process.env.NEXT_PUBLIC_ENABLE_IDLE_TIMER !== 'false',
  ENABLE_TOKEN_REFRESH: process.env.NEXT_PUBLIC_ENABLE_TOKEN_REFRESH !== 'false',
  ENABLE_SESSION_STORAGE: process.env.NEXT_PUBLIC_ENABLE_SESSION_STORAGE !== 'false',
  
  // Development settings
  DEBUG_SESSION: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_SESSION === 'true'
} as const

// Helper functions
export const getSessionDurationHours = () => SESSION_CONFIG.SESSION_DURATION / (1000 * 60 * 60)
export const getInactivityTimeoutMinutes = () => SESSION_CONFIG.INACTIVITY_TIMEOUT / (1000 * 60)
export const getRefreshIntervalMinutes = () => SESSION_CONFIG.REFRESH_INTERVAL / (1000 * 60)

// Validation
if (SESSION_CONFIG.SESSION_DURATION < SESSION_CONFIG.INACTIVITY_TIMEOUT) {
  console.warn('⚠️ Session duration is less than inactivity timeout. This may cause unexpected behavior.')
}

if (SESSION_CONFIG.INACTIVITY_TIMEOUT < SESSION_CONFIG.WARNING_BEFORE_LOGOUT) {
  console.warn('⚠️ Inactivity timeout is less than warning duration. This may cause unexpected behavior.')
}

export default SESSION_CONFIG
