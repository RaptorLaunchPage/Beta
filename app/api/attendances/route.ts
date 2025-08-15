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

// GET list attendances with optional timeframe and team filter
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
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const teamId = searchParams.get('teamId')

    // Validate team ID if provided
    if (teamId && !isValidUuid(teamId)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - timeframe)

    let query = supabase
      .from('attendances')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Role-based filtering
    if (checkRoleAccess(user.role, ['admin', 'manager'])) {
      // allow optional team filter
      if (teamId) query = query.eq('team_id', teamId)
    } else if (checkRoleAccess(user.role, ['coach', 'analyst'])) {
      if (user.team_id) query = query.eq('team_id', user.team_id)
      else return createSuccessResponse([])
    } else if (user.role === 'player') {
      query = query.eq('player_id', user.id)
    } else {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { data, error: qErr } = await query.order('created_at', { ascending: false })
    if (qErr) {
      return createErrorResponse({
        error: qErr.message,
        code: 'DATABASE_ERROR',
        status: 500
      })
    }
    return createSuccessResponse(data || [])
  } catch (e: any) {
    console.error('Attendances GET error:', e)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// POST create attendance
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

    const body = await request.json()
    const { player_id, team_id, date, session_time, status: attStatus, slot_id, session_id, source } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['player_id', 'team_id', 'date', 'status'])
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate UUIDs
    if (!isValidUuid(player_id)) {
      return createErrorResponse({
        error: 'Invalid player ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    if (!isValidUuid(team_id)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Permissions: players can create for themselves only; coach limited to their team; manager/admin unrestricted
    if (user.role === 'player') {
      if (player_id !== user.id) {
        return createErrorResponse({
          error: 'Players can only mark their own attendance',
          code: 'INSUFFICIENT_PERMISSIONS',
          status: 403
        })
      }
    } else if (user.role === 'coach') {
      if (!user.team_id || user.team_id !== team_id) {
        return createErrorResponse({
          error: 'Coaches can only mark for their own team',
          code: 'TEAM_ACCESS_DENIED',
          status: 403
        })
      }
    } else if (!checkRoleAccess(user.role, ['admin', 'manager'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { data, error: insErr } = await supabase
      .from('attendances')
      .insert({ 
        player_id, 
        team_id, 
        date, 
        session_time, 
        status: attStatus, 
        slot_id: slot_id || null, 
        session_id: session_id || null, 
        source: source || 'manual' 
      })
      .select()
      .single()

    if (insErr) {
      return createErrorResponse({
        error: insErr.message,
        code: 'DATABASE_ERROR',
        status: 500
      })
    }
    return createSuccessResponse({ success: true, attendance: data })
  } catch (e: any) {
    console.error('Attendances POST error:', e)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// PUT update attendance status
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

    const body = await request.json()
    const { id, status: newStatus, notes } = body

    if (!id) {
      return createErrorResponse({
        error: 'Attendance ID is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate UUID
    if (!isValidUuid(id)) {
      return createErrorResponse({
        error: 'Invalid attendance ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Get current attendance record for permission check
    const { data: currentAttendance, error: fetchErr } = await supabase
      .from('attendances')
      .select('player_id, team_id')
      .eq('id', id)
      .single()

    if (fetchErr || !currentAttendance) {
      return createErrorResponse({
        error: 'Attendance record not found',
        code: 'NOT_FOUND',
        status: 404
      })
    }

    // Permission checks
    if (user.role === 'player') {
      if (currentAttendance.player_id !== user.id) {
        return createErrorResponse({
          error: 'Players can only update their own attendance',
          code: 'INSUFFICIENT_PERMISSIONS',
          status: 403
        })
      }
    } else if (user.role === 'coach') {
      if (!user.team_id || currentAttendance.team_id !== user.team_id) {
        return createErrorResponse({
          error: 'Coaches can only update attendance for their own team',
          code: 'TEAM_ACCESS_DENIED',
          status: 403
        })
      }
    } else if (!checkRoleAccess(user.role, ['admin', 'manager'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { data, error: updateErr } = await supabase
      .from('attendances')
      .update({ status: newStatus, notes: notes || null })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return createErrorResponse({
        error: updateErr.message,
        code: 'DATABASE_ERROR',
        status: 500
      })
    }
    return createSuccessResponse({ success: true, attendance: data })
  } catch (e: any) {
    console.error('Attendances PUT error:', e)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// DELETE attendance
export async function DELETE(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Attendance id required' }, { status: 400 })

    const { data: existing } = await userSupabase.from('attendances').select('id, team_id, player_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })

    if (userData.role === 'player' && existing.player_id !== userData.id) {
      return NextResponse.json({ error: 'Players can only delete their own attendance' }, { status: 403 })
    }
    if (userData.role === 'coach' && userData.team_id !== existing.team_id) {
      return NextResponse.json({ error: 'Coaches can only delete their own team' }, { status: 403 })
    }
    if (!['admin', 'manager', 'coach', 'player'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error: delErr } = await userSupabase.from('attendances').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Attendances DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}