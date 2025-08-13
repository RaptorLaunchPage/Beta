import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET - Fetch sessions
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const teamId = searchParams.get('team_id')
    const sessionType = searchParams.get('session_type')

    let query = userSupabase!
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
    if (userData!.role === 'player' || userData!.role === 'coach') {
      query = query.eq('team_id', userData!.team_id)
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
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Error in sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create session
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only admins, managers, and coaches can create sessions
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can create sessions' },
        { status: 403 }
      )
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
      description,
      is_mandatory = true 
    } = body

    if (!team_id || !session_type || !date) {
      return NextResponse.json(
        { error: 'Team ID, session type, and date are required' },
        { status: 400 }
      )
    }

    // Coaches can only create sessions for their own team
    if (userData!.role === 'coach' && userData!.team_id !== team_id) {
      return NextResponse.json(
        { error: 'Coaches can only create sessions for their own team' },
        { status: 403 }
      )
    }

    const { data, error: insertError } = await userSupabase!
      .from('sessions')
      .insert({
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
        created_by: userData!.id
      })
      .select()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Error in sessions POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update session
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only admins, managers, and coaches can update sessions
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can update sessions' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Coaches can only update sessions for their own team
    if (userData!.role === 'coach' && team_id && userData!.team_id !== team_id) {
      return NextResponse.json(
        { error: 'Coaches can only update sessions for their own team' },
        { status: 403 }
      )
    }

    const { data, error: updateError } = await userSupabase!
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
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Error in sessions PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete session
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only admins, managers, and coaches can delete sessions
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can delete sessions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // For coaches, check if the session belongs to their team before deleting
    if (userData!.role === 'coach') {
      const { data: sessionData, error: sessionError } = await userSupabase!
        .from('sessions')
        .select('team_id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      if (sessionData.team_id !== userData!.team_id) {
        return NextResponse.json(
          { error: 'Coaches can only delete sessions for their own team' },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await userSupabase!
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in sessions DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}