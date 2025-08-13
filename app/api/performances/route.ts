import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with anon key (safer for development)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create a client with the user's token for RLS
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  // Get user data using the authenticated client
  const { data: userData, error: userError } = await userSupabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userSupabase }
}

// GET - Fetch performances
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) {
      return NextResponse.json({ error: error || 'Service unavailable' }, { status: status || 500 })
    }

    // First check if performances table exists and is accessible
    const { data: testQuery, error: testError } = await userSupabase
      .from("performances")
      .select("id")
      .limit(1)

    if (testError) {
      console.error('Performances table access error:', testError)
      // If table doesn't exist or no access, return empty array instead of error
      if (testError.code === 'PGRST116' || testError.message?.includes('relation') || testError.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      return NextResponse.json(
        { error: `Database error: ${testError.message}` },
        { status: 500 }
      )
    }

    // Try a simplified query first without relationships
    let query = userSupabase
      .from("performances")
      .select("*", { count: 'exact' })

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '0')
    const teamId = searchParams.get('teamId')
    const playerId = searchParams.get('playerId')
    const map = searchParams.get('map')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const isPaginated = !!(limitParam || offsetParam)
    const limit = Math.min(parseInt(limitParam || '0') || 0, 100)
    const offset = Math.max(parseInt(offsetParam || '0') || 0, 0)

    if (timeframe > 0) {
      const start = new Date(); start.setDate(start.getDate() - timeframe)
      query = query.gte('created_at', start.toISOString())
    }

    // Apply role-based filtering
    if (userData!.role === "player") {
      // Players can see their own performance AND their team's performance
      if (userData!.team_id) {
        query = query.or(`player_id.eq.${userData!.id},team_id.eq.${userData!.team_id}`)
      } else {
        query = query.eq("player_id", userData!.id)
      }
    } else if (userData!.role === "coach" && userData!.team_id) {
      query = query.eq("team_id", userData!.team_id)
    }
    // Admin, manager, and analyst can see all performances (no filtering)

    // Additional filters
    if (teamId && (userData!.role === 'admin' || userData!.role === 'manager')) {
      query = query.eq('team_id', teamId)
    }
    if (playerId) {
      query = query.eq('player_id', playerId)
    }
    if (map) {
      query = query.eq('map', map)
    }

    let finalQuery = query.order("created_at", { ascending: false })
    if (isPaginated && limit > 0) {
      finalQuery = finalQuery.range(offset, offset + limit - 1)
    }

    const { data, error: queryError, count } = await finalQuery

    if (queryError) {
      console.error('Error fetching performances:', queryError)
      return NextResponse.json(
        { error: `Query error: ${queryError.message}` },
        { status: 500 }
      )
    }

    if (isPaginated) {
      return NextResponse.json({ items: data || [], total: count ?? (data?.length || 0) })
    }
    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Error in performances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Submit performance data
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) {
      return NextResponse.json({ error: error || 'Service unavailable' }, { status: status || 500 })
    }

    const performanceData = await request.json()

    // Validate required fields
    const requiredFields = ['match_number', 'map']
    const missingFields = requiredFields.filter(field => !performanceData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Role-based validation and data assignment
    if (userData!.role === 'player') {
      // Players can only submit their own performance
      performanceData.player_id = userData!.id
      performanceData.team_id = userData!.team_id
    } else if (['coach', 'manager', 'admin'].includes(userData!.role)) {
      // Coaches, managers, and admins can submit for other players
      
      // Validate required fields for staff submissions
      if (!performanceData.player_id || !performanceData.team_id) {
        return NextResponse.json(
          { error: 'Player ID and Team ID are required for staff submissions' },
          { status: 400 }
        )
      }

      // Coaches can only submit for players in their team
      if (userData!.role === 'coach' && userData!.team_id !== performanceData.team_id) {
        return NextResponse.json(
          { error: 'Coaches can only submit performance data for players in their own team' },
          { status: 403 }
        )
      }

      // Verify the player exists and belongs to the specified team
      const { data: playerData, error: playerError } = await userSupabase
        .from('users')
        .select('id, team_id, role, status')
        .eq('id', performanceData.player_id)
        .single()

      if (playerError || !playerData) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        )
      }

      if (playerData.role !== 'player') {
        return NextResponse.json(
          { error: 'Selected user is not a player' },
          { status: 400 }
        )
      }

      if (playerData.team_id !== performanceData.team_id) {
        return NextResponse.json(
          { error: 'Player does not belong to the specified team' },
          { status: 400 }
        )
      }

      if (playerData.status !== 'Active') {
        return NextResponse.json(
          { error: 'Cannot submit performance for inactive players' },
          { status: 400 }
        )
      }
    } else {
      // Other roles (like analyst) cannot submit performance data
      return NextResponse.json(
        { error: 'Insufficient permissions to submit performance data' },
        { status: 403 }
      )
    }

    // Validate team assignment for players only
    if (userData!.role === 'player' && !performanceData.team_id && userData!.team_id) {
      performanceData.team_id = userData!.team_id
    }

    if (!performanceData.team_id) {
      return NextResponse.json(
        { error: 'Player must be assigned to a team to submit performance' },
        { status: 400 }
      )
    }

    // Insert performance data
    const { data: newPerformance, error: insertError } = await userSupabase
      .from('performances')
      .insert({
        player_id: performanceData.player_id || userData!.id,
        team_id: performanceData.team_id,
        match_number: performanceData.match_number,
        slot: performanceData.slot || null,
        map: performanceData.map,
        placement: performanceData.placement || null,
        kills: performanceData.kills || 0,
        damage: performanceData.damage || 0,
        survival_time: performanceData.survival_time || 0,
        assists: performanceData.assists || 0,
        added_by: userData!.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting performance:', insertError)
      const message = insertError.message || ''
      const migrationHint = message.includes('attendances') && message.includes('date')
        ? 'Attendance trigger mismatch detected. Please apply scripts/15-fix-auto-attendance-trigger.sql to update triggers.'
        : ''
      return NextResponse.json(
        { error: `Failed to submit performance: ${message}. ${migrationHint}`.trim() },
        { status: 500 }
      )
    }

    // Auto-create match attendance (Scrims session)
    try {
      await createMatchAttendance(userSupabase, newPerformance, userData!)
    } catch (attendanceError) {
      console.warn('Failed to create match attendance:', attendanceError)
      // Don't fail the performance submission if attendance creation fails
    }

    return NextResponse.json({
      success: true,
      performance: newPerformance,
      message: 'Performance submitted successfully'
    })

  } catch (error) {
    console.error('Error in performance submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create match attendance
async function createMatchAttendance(userSupabase: any, performance: any, userData: any) {
  // Use current date for session and attendance
  const currentDate = new Date().toISOString().split('T')[0]
  
  // Check if session already exists for this match
  const { data: existingSession, error: sessionCheckError } = await userSupabase
    .from('sessions')
    .select('id')
    .eq('team_id', performance.team_id)
    .eq('date', currentDate)
    .eq('session_type', 'tournament')
    .eq('session_subtype', 'Scrims')
    .single()

  let sessionId = existingSession?.id

  // Create session if it doesn't exist
  if (!sessionId) {
    const sessionTitle = `Match ${performance.match_number} - ${performance.map}`
    
    const { data: newSession, error: sessionCreateError } = await userSupabase
      .from('sessions')
      .insert({
        team_id: performance.team_id,
        session_type: 'tournament',
        session_subtype: 'Scrims',
        date: currentDate,
        start_time: '18:00:00',
        end_time: '22:00:00',
        cutoff_time: null,
        title: sessionTitle,
        is_mandatory: false,
        created_by: userData.id
      })
      .select()
      .single()

    if (sessionCreateError) {
      throw new Error(`Failed to create session: ${sessionCreateError.message}`)
    }

    sessionId = newSession.id
  }

  // Check if attendance already exists
  const { data: existingAttendance } = await userSupabase
    .from('attendances')
    .select('id')
    .eq('session_id', sessionId)
    .eq('player_id', performance.player_id)
    .single()

  if (!existingAttendance) {
    // Create attendance record with schema-compliant fields
    const attendanceData = {
      player_id: performance.player_id,
      team_id: performance.team_id,
      session_id: sessionId,
      status: 'present',
      source: 'auto',
      slot_id: performance.slot ?? null,
      created_at: new Date().toISOString()
    }

    const { error: attendanceCreateError } = await userSupabase
      .from('attendances')
      .insert(attendanceData)
      .select()

    if (attendanceCreateError) {
      throw new Error(`Failed to create attendance: ${attendanceCreateError.message}`)
    }
  }
}