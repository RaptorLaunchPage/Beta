import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  validateRequiredFields,
  isValidUuid,
  handleCors
} from '@/lib/api-utils'

// GET - Fetch sessions
export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const teamId = searchParams.get('team_id')
    const sessionType = searchParams.get('session_type')

    // Validate team ID if provided
    if (teamId && !isValidUuid(teamId)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    let query = supabase
      .from('sessions')
      .select(`
        *,
        teams:team_id(id, name),
        created_by_user:created_by(id, name, email)
      `)

    // Apply date filter
    if (dateParam) {
      query = query.eq('date', dateParam)
    } else {
      // Default to current date
      query = query.eq('date', new Date().toISOString().split('T')[0])
    }

    // Apply team filter based on role
    if (checkRoleAccess(user.role, ['player', 'coach'])) {
      query = query.eq('team_id', user.team_id)
    } else if (teamId) {
      query = query.eq('team_id', teamId)
    }

    // Apply session type filter
    if (sessionType) {
      query = query.eq('session_type', sessionType)
    }

    const { data, error: queryError } = await query.order('date', { ascending: true })

    if (queryError) {
      console.error('Error fetching sessions:', queryError)
      return createErrorResponse({
        error: 'Failed to fetch sessions',
        code: 'DATABASE_ERROR',
        status: 500,
        details: queryError.message
      })
    }

    return createSuccessResponse(data || [])

  } catch (error) {
    console.error('Error in sessions API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// POST - Create new session
export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check permissions
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Insufficient permissions to create sessions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const body = await request.json()
    const {
      team_id,
      session_type,
      session_subtype,
      date,
      start_time,
      end_time,
      cutoff_time,
      title,
      is_mandatory = false,
      description = ''
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['team_id', 'session_type', 'date', 'start_time', 'end_time', 'title'])
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate UUIDs
    if (!isValidUuid(team_id)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // For coaches, ensure they can only create sessions for their team
    if (user.role === 'coach' && team_id !== user.team_id) {
      return createErrorResponse({
        error: 'Coaches can only create sessions for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    // Create session
    const sessionData = {
      team_id,
      session_type,
      session_subtype: session_subtype || null,
      date,
      start_time,
      end_time,
      cutoff_time: cutoff_time || null,
      title,
      is_mandatory,
      description,
      created_by: user.id
    }

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select(`
        *,
        teams:team_id(id, name),
        created_by_user:created_by(id, name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return createErrorResponse({
        error: 'Failed to create session',
        code: 'DATABASE_ERROR',
        status: 500,
        details: insertError.message
      })
    }

    return createSuccessResponse(session, 'Session created successfully', 201)

  } catch (error) {
    console.error('Error in session creation:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// PUT - Update session
export async function PUT(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Only admins, managers, and coaches can update sessions
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Only administrators, managers, and coaches can update sessions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const body = await request.json()
    const { 
      id,
      team_id, 
      session_type, 
      session_subtype, 
      date, 
      start_time, 
      end_time, 
      cutoff_time, 
      title, 
      description,
      is_mandatory 
    } = body

    if (!id) {
      return createErrorResponse({
        error: 'Session ID is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Coaches can only update sessions for their own team
    if (user.role === 'coach' && team_id && user.team_id !== team_id) {
      return createErrorResponse({
        error: 'Coaches can only update sessions for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    const { data, error: updateError } = await supabase
      .from('sessions')
      .update({
        team_id,
        session_type,
        session_subtype,
        date,
        start_time,
        end_time,
        cutoff_time,
        title,
        description,
        is_mandatory,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return createErrorResponse({
        error: 'Failed to update session',
        code: 'DATABASE_ERROR',
        status: 500,
        details: updateError.message
      })
    }

    return createSuccessResponse(data[0])

  } catch (error) {
    console.error('Error in sessions PUT API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// DELETE - Delete session
export async function DELETE(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Only admins, managers, and coaches can delete sessions
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Only administrators, managers, and coaches can delete sessions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return createErrorResponse({
        error: 'Session ID is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // For coaches, check if the session belongs to their team before deleting
    if (user.role === 'coach') {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('team_id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        return createErrorResponse({
          error: 'Session not found',
          code: 'NOT_FOUND',
          status: 404
        })
      }

      if (sessionData.team_id !== user.team_id) {
        return createErrorResponse({
          error: 'Coaches can only delete sessions for their own team',
          code: 'TEAM_ACCESS_DENIED',
          status: 403
        })
      }
    }

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return createErrorResponse({
        error: 'Failed to delete session',
        code: 'DATABASE_ERROR',
        status: 500,
        details: deleteError.message
      })
    }

    return createSuccessResponse({ success: true })

  } catch (error) {
    console.error('Error in sessions DELETE API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}