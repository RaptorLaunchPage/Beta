import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

async function getUserFromRequest(request: NextRequest) {
  if (!supabase) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { session_id, status: attendanceStatus, player_id } = await request.json()

    if (!session_id || !attendanceStatus) {
      return NextResponse.json(
        { error: 'session_id and status are required' },
        { status: 400 }
      )
    }

    if (!['present', 'late', 'absent'].includes(attendanceStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be present, late, or absent' },
        { status: 400 }
      )
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Ensure session has a valid date
    if (!session.date) {
      console.warn('Session missing date, using current date')
      session.date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Determine who is marking attendance
    let targetPlayerId = userData!.id
    let source = 'manual'

    // If player_id is provided and user is coach/manager/admin, mark for that player
    if (player_id && ['coach', 'manager', 'admin'].includes(userData!.role)) {
      targetPlayerId = player_id
      source = 'manual' // Still manual, but marked by coach/admin
    } else if (userData!.role === 'player') {
      // Players can only mark for themselves
      targetPlayerId = userData!.id
    } else if (!player_id) {
      return NextResponse.json(
        { error: 'player_id required for coach/admin marking attendance' },
        { status: 400 }
      )
    }

    // Validate team access
    if (userData!.role === 'player' && session.team_id !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Cannot mark attendance for other team sessions' },
        { status: 403 }
      )
    }

    if (userData!.role === 'coach' && userData!.team_id && session.team_id !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Cannot mark attendance for other team sessions' },
        { status: 403 }
      )
    }

    // Check if player is assigned to the session's team
    const { data: player, error: playerError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', targetPlayerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (player.team_id !== session.team_id) {
      return NextResponse.json(
        { error: 'Player is not assigned to this team' },
        { status: 400 }
      )
    }

    // Check for duplicate attendance on the same day
    const { data: existingDayAttendance, error: dayCheckError } = await supabase
      .from('attendances')
      .select(`
        id, 
        status,
        sessions!inner (
          id,
          date,
          session_type
        )
      `)
      .eq('player_id', targetPlayerId)
      .eq('sessions.date', session.date)
      .eq('sessions.session_type', 'practice')
      .in('status', ['present', 'late'])

    if (dayCheckError) {
      console.error('Error checking existing attendance:', dayCheckError)
      return NextResponse.json(
        { error: 'Failed to validate attendance' },
        { status: 500 }
      )
    }

    // If player already marked present/late for another session today, prevent duplicate
    if (existingDayAttendance && existingDayAttendance.length > 0) {
      const existingSession = existingDayAttendance[0].sessions
      return NextResponse.json(
        { 
          error: `Already marked ${existingDayAttendance[0].status} for ${session.date}. Only one attendance per day is allowed.`,
          existing_session: existingSession
        },
        { status: 400 }
      )
    }

    // Check if attendance already exists for this specific session
    const { data: existingAttendance, error: existingError } = await supabase
      .from('attendances')
      .select('id, status')
      .eq('session_id', session_id)
      .eq('player_id', targetPlayerId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing attendance:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing attendance' },
        { status: 500 }
      )
    }

    if (existingAttendance) {
      // Update existing attendance
      const { data: updatedAttendance, error: updateError } = await supabase
        .from('attendances')
        .update({
          status: attendanceStatus,
          source: source,
          marked_by: userData!.id
        })
        .eq('id', existingAttendance.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating attendance:', updateError)
        return NextResponse.json(
          { error: 'Failed to update attendance' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        attendance: updatedAttendance,
        message: `Attendance updated to ${attendanceStatus}`
      })
    } else {
      // Create new attendance record
      const { data: newAttendance, error: insertError } = await supabase
        .from('attendances')
        .insert({
          player_id: targetPlayerId,
          team_id: session.team_id,
          date: session.date,
          session_time: session.session_subtype, // Keep for compatibility
          session_id: session_id,
          status: attendanceStatus,
          source: source,
          marked_by: userData!.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating attendance:', insertError)
        return NextResponse.json(
          { error: `Failed to mark attendance: ${insertError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        attendance: newAttendance,
        message: `Attendance marked as ${attendanceStatus}`
      })
    }

  } catch (error) {
    console.error('Error in mark attendance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}