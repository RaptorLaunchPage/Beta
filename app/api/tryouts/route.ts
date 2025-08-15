import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  validateRequiredFields,
  handleCors
} from '@/lib/api-utils'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase: userSupabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !userSupabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check if user has permission to view tryouts
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    // Fetch tryouts with application counts
    const { data: tryouts, error } = await userSupabase
      .from('tryouts')
      .select(`
        *,
        creator:created_by(name, email)
      `)
      .order('created_at', { ascending: false })

    // Get application counts separately since Supabase doesn't support aggregate joins
    if (tryouts && !error) {
      for (const tryout of tryouts) {
        const { count } = await userSupabase
          .from('tryout_applications')
          .select('*', { count: 'exact', head: true })
          .eq('tryout_id', tryout.id)
        
        tryout._count = { applications: count || 0 }
      }
    }

    if (error) {
      console.error('Database error:', error)
      return createErrorResponse({
        error: 'Failed to fetch tryouts',
        code: 'DATABASE_ERROR',
        status: 500,
        details: error.message
      })
    }

    return createSuccessResponse({ tryouts })

  } catch (error) {
    console.error('API error:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase: userSupabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !userSupabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const body = await request.json()
    const {
      name,
      description,
      purpose,
      target_roles = [],
      team_ids = [],
      type,
      open_to_public = true,
      application_deadline,
      evaluation_method = 'manual',
      requirements,
      additional_links = []
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['name', 'purpose', 'type'])
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Create tryout
    const tryoutData = {
      name,
      description,
      purpose,
      target_roles,
      team_ids,
      type,
      open_to_public,
      application_deadline,
      evaluation_method,
      requirements,
      additional_links,
      created_by: user.id
    }

    const { data: tryout, error: insertError } = await userSupabase
      .from('tryouts')
      .insert(tryoutData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating tryout:', insertError)
      return createErrorResponse({
        error: 'Failed to create tryout',
        code: 'DATABASE_ERROR',
        status: 500,
        details: insertError.message
      })
    }

    return createSuccessResponse(tryout, 'Tryout created successfully', 201)

  } catch (error) {
    console.error('Error in tryout creation:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}
