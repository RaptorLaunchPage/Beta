import { NextResponse } from 'next/server'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export function createApiError(message: string, statusCode: number = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.code = code
  return error
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error)
  
  // Handle different error types
  if (error instanceof Error) {
    const apiError = error as ApiError
    
    // Return appropriate status codes based on error type
    if (apiError.statusCode) {
      return NextResponse.json(
        { 
          error: apiError.message,
          code: apiError.code 
        },
        { status: apiError.statusCode }
      )
    }
    
    // Common error patterns
    if (apiError.message.includes('unauthorized') || apiError.message.includes('auth')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (apiError.message.includes('forbidden') || apiError.message.includes('permission')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    if (apiError.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }
    
    if (apiError.message.includes('validation') || apiError.message.includes('invalid')) {
      return NextResponse.json(
        { error: apiError.message },
        { status: 400 }
      )
    }
    
    // Generic error response
    return NextResponse.json(
      { error: apiError.message },
      { status: 500 }
    )
  }
  
  // Handle non-Error objects
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  )
}

export function validateRequest(data: unknown, requiredFields: string[]): string | null {
  if (!data || typeof data !== 'object') {
    return 'Request body must be a valid JSON object'
  }
  
  const dataObj = data as Record<string, unknown>
  
  for (const field of requiredFields) {
    if (!(field in dataObj) || dataObj[field] === undefined || dataObj[field] === null) {
      return `Missing required field: ${field}`
    }
  }
  
  return null
}

export function rateLimitCheck(requestCount: number, maxRequests: number = 100): boolean {
  return requestCount < maxRequests
}