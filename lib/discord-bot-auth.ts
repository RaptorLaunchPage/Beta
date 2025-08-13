import { NextRequest } from 'next/server'

/**
 * Validates the RaptorBot API key from request headers
 * @param request - NextRequest object
 * @returns boolean indicating if the API key is valid
 */
export function validateBotApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('authorization')
  const expectedKey = `Bearer ${process.env.RAPTOR_BOT_API_KEY}`
  
  // Check if API key exists in environment
  if (!process.env.RAPTOR_BOT_API_KEY) {
    console.error('RAPTOR_BOT_API_KEY environment variable is not set')
    return false
  }
  
  // Validate API key format and value
  if (!apiKey || apiKey !== expectedKey) {
    console.warn('Invalid or missing Discord bot API key in request')
    return false
  }
  
  return true
}

/**
 * Gets client IP address from request headers
 * @param request - NextRequest object
 * @returns string with client IP or null
 */
export function getClientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || // Cloudflare
         null
}

/**
 * Gets user agent from request headers
 * @param request - NextRequest object
 * @returns string with user agent or null
 */
export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get('user-agent') || null
}

/**
 * Rate limiting configuration for Discord bot API endpoints
 */
export const RATE_LIMITS = {
  // Performance uploads - high frequency expected
  performance: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 1 per second average
  },
  
  // Attendance marking - moderate frequency
  attendance: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 1 per 2 seconds average
  },
  
  // Data queries - moderate frequency
  queries: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // High limit for queries
  },
  
  // Tryout operations - low frequency
  tryouts: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // Conservative limit
  }
}

/**
 * Standard error responses for Discord bot API
 */
export const BOT_API_ERRORS = {
  UNAUTHORIZED: {
    error: 'Unauthorized',
    message: 'Invalid or missing API key',
    code: 'BOT_AUTH_001'
  },
  
  RATE_LIMITED: {
    error: 'Rate Limited',
    message: 'Too many requests',
    code: 'BOT_RATE_001'
  },
  
  MISSING_PARAMS: {
    error: 'Bad Request',
    message: 'Missing required parameters',
    code: 'BOT_PARAM_001'
  },
  
  NOT_FOUND: {
    error: 'Not Found',
    message: 'Resource not found',
    code: 'BOT_NOT_FOUND_001'
  },
  
  SERVER_ERROR: {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'BOT_SERVER_001'
  }
}

/**
 * Logs Discord bot API requests for monitoring
 * @param request - NextRequest object
 * @param endpoint - API endpoint name
 * @param success - Whether the request was successful
 * @param responseTime - Response time in milliseconds
 */
export function logBotApiRequest(
  request: NextRequest, 
  endpoint: string, 
  success: boolean, 
  responseTime?: number
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint,
    method: request.method,
    success,
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    responseTime: responseTime ? `${responseTime}ms` : undefined
  }
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'development') {
    console.log('🤖 Discord Bot API Request:', logData)
  }
}