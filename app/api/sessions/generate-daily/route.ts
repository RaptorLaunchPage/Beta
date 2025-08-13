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

    // Only admins, managers, and coaches can trigger session generation
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { date } = await request.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Call the database function to generate daily sessions
    const { data: result, error: generateError } = await supabase
      .rpc('generate_daily_practice_sessions', { target_date: targetDate })

    if (generateError) {
      console.error('Error generating sessions:', generateError)
      return NextResponse.json(
        { error: `Failed to generate sessions: ${generateError.message}` },
        { status: 500 }
      )
    }

    // Get the generated sessions for the response
    const { data: sessions, error: sessionsError } = await supabase
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
        team_id,
        teams:team_id (
          name
        )
      `)
      .eq('date', targetDate)
      .eq('session_type', 'practice')
      .order('team_id')
      .order('start_time')

    if (sessionsError) {
      console.warn('Error fetching generated sessions:', sessionsError)
    }

    return NextResponse.json({
      success: true,
      sessions_created: result || 0,
      sessions: sessions || [],
      target_date: targetDate,
      message: `Generated ${result || 0} practice sessions for ${targetDate}`
    })

  } catch (error) {
    console.error('Error in generate daily sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

    // Only admins, managers, and coaches can view session generation status
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Check what sessions exist for the date
    const { data: sessions, error: sessionsError } = await supabase
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
        team_id,
        is_mandatory,
        teams:team_id (
          name,
          status
        )
      `)
      .eq('date', date)
      .eq('session_type', 'practice')
      .order('team_id')
      .order('start_time')

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Get active teams count
    const { data: activeTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('status', 'active')

    const expectedSessions = (activeTeams?.length || 0) * 3 // 3 sessions per team (Morning, Evening, Night)
    const actualSessions = sessions?.length || 0

    return NextResponse.json({
      date,
      active_teams: activeTeams?.length || 0,
      expected_sessions: expectedSessions,
      actual_sessions: actualSessions,
      sessions_complete: actualSessions >= expectedSessions,
      sessions: sessions || [],
      teams: activeTeams || []
    })

  } catch (error) {
    console.error('Error in session status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}