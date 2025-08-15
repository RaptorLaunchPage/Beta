import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse({
        error: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        status: 503
      })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return createSuccessResponse({ session: null })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error)
      return createErrorResponse({
        error: 'Failed to get session',
        code: 'SESSION_ERROR',
        status: 500,
        details: error.message
      })
    }
    
    return createSuccessResponse({ 
      session: session || { access_token: token }
    })

  } catch (error) {
    console.error('Session error:', error)
    return createSuccessResponse({ session: null })
  }
}