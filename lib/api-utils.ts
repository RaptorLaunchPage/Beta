import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

// Standardized error response interface
export interface ApiError {
  error: string
  code?: string
  status: number
  details?: any
}

// Standardized success response interface
export interface ApiSuccess<T = any> {
  data: T
  message?: string
  status: number
}

// User data interface
export interface ApiUser {
  id: string
  role: string
  team_id?: string
  name?: string
  email?: string
}

// Standardized authentication function
export async function authenticateRequest(request: NextRequest): Promise<{
  user: ApiUser | null
  supabase: ReturnType<typeof createClient<Database>> | null
  error: ApiError | null
}> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        user: null,
        supabase: null,
        error: {
          error: 'Service unavailable',
          code: 'SERVICE_UNAVAILABLE',
          status: 503
        }
      }
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return {
        user: null,
        supabase: null,
        error: {
          error: 'Authorization header required',
          code: 'MISSING_AUTH_HEADER',
          status: 401
        }
      }
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return {
        user: null,
        supabase: null,
        error: {
          error: 'Invalid authorization token',
          code: 'INVALID_TOKEN',
          status: 401
        }
      }
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return {
        user: null,
        supabase: null,
        error: {
          error: 'Invalid or expired token',
          code: 'AUTH_FAILED',
          status: 401
        }
      }
    }

    // Get user profile from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, team_id, name, email')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return {
        user: null,
        supabase: null,
        error: {
          error: 'User profile not found',
          code: 'USER_NOT_FOUND',
          status: 404
        }
      }
    }

    return {
      user: userData,
      supabase,
      error: null
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      user: null,
      supabase: null,
      error: {
        error: 'Internal authentication error',
        code: 'AUTH_INTERNAL_ERROR',
        status: 500
      }
    }
  }
}

// Standardized error response function
export function createErrorResponse(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      error: error.error,
      code: error.code,
      details: error.details
    },
    { status: error.status }
  )
}

// Standardized success response function
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      data,
      message,
      success: true
    },
    { status }
  )
}

// Role-based access control helper
export function checkRoleAccess(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

// Team access control helper
export function checkTeamAccess(userTeamId: string | null, targetTeamId: string | null, userRole: string): boolean {
  if (['admin', 'manager'].includes(userRole)) {
    return true // Admin and manager can access all teams
  }
  return userTeamId === targetTeamId
}

// Input validation helper
export function validateRequiredFields(body: any, requiredFields: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

// UUID validation helper
export function isValidUuid(value: any): boolean {
  if (typeof value !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

// Date validation helper
export function isValidDate(value: any): boolean {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

// Pagination helper
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // Cap at 100 items per page
    offset
  }
}

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders
    })
  }
  return null
}