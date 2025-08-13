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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range (past 3 days + today + next 7 days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 3)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    let sessionsQuery = supabase
      .from('sessions')
      .select(`
        id,
        session_type,
        session_subtype,
        date,
        start_time,
        end_time,
        cutoff_time,
        title,
        is_mandatory,
        team_id,
        attendances!inner (
          id,
          status,
          source,
          player_id
        )
      `)
      .eq('session_type', 'practice')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply role-based filtering
    if (userData!.role === 'player') {
      // Players see their team's sessions with their own attendance
      if (!userData!.team_id) {
        return NextResponse.json({
          sessions: [],
          message: 'Player not assigned to a team. Please contact your administrator.'
        })
      }
      sessionsQuery = sessionsQuery
        .eq('team_id', userData!.team_id)
        .eq('attendances.player_id', userData!.id)
    } else if (userData!.role === 'coach' && userData!.team_id) {
      // Coaches see their team's sessions with all attendances
      sessionsQuery = sessionsQuery.eq('team_id', userData!.team_id)
    } else if (['manager', 'admin'].includes(userData!.role)) {
      // Managers and admins can see all sessions
      // No additional filtering needed
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // For non-players, we need to get sessions without requiring attendance records
    if (userData!.role !== 'player') {
      // Get sessions without attendance filter
      let allSessionsQuery = supabase
        .from('sessions')
        .select(`
          id,
          session_type,
          session_subtype,
          date,
          start_time,
          end_time,
          cutoff_time,
          title,
          is_mandatory,
          team_id
        `)
        .eq('session_type', 'practice')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (userData!.role === 'coach' && userData!.team_id) {
        allSessionsQuery = allSessionsQuery.eq('team_id', userData!.team_id)
      }

      const { data: allSessions, error: allSessionsError } = await allSessionsQuery

      if (allSessionsError) {
        console.error('Error fetching all sessions:', allSessionsError)
        return NextResponse.json(
          { error: 'Failed to fetch sessions' },
          { status: 500 }
        )
      }

      // Get attendance data separately for these sessions
      const sessionIds = allSessions?.map(s => s.id) || []
      
      if (sessionIds.length > 0) {
        let attendanceQuery = supabase
          .from('attendances')
          .select('session_id, status, source, player_id')
          .in('session_id', sessionIds)

        // If coach, filter to their team's players
        if (userData!.role === 'coach' && userData!.team_id) {
          const { data: teamPlayers } = await supabase
            .from('users')
            .select('id')
            .eq('team_id', userData!.team_id)
            .eq('role', 'player')
          
          if (teamPlayers && teamPlayers.length > 0) {
            attendanceQuery = attendanceQuery.in('player_id', teamPlayers.map(p => p.id))
          }
        }

        const { data: attendances } = await attendanceQuery

        // Merge attendance data with sessions
        const sessionsWithAttendance = allSessions?.map(session => ({
          ...session,
          attendances: attendances?.filter(a => a.session_id === session.id) || []
        }))

        return NextResponse.json({
          sessions: sessionsWithAttendance || []
        })
      }

      return NextResponse.json({
        sessions: allSessions || []
      })
    }

    return NextResponse.json({
      sessions: sessions || []
    })

  } catch (error) {
    console.error('Error in daily practice sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}