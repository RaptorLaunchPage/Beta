import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
    global: { headers: { Authorization: `Bearer ${token}` } }
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

// GET - Fetch teams
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
      return NextResponse.json({ error }, { status: status || 500 })
    }

    // Check permissions - allow players to see their own team data
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst', 'player']
    if (!allowedRoles.includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view teams' },
        { status: 403 }
      )
    }

    let query = userSupabase
      .from('teams')
      .select('id, name, tier, status')
      .order('name', { ascending: true })

    // Role-based filtering
    if (userData!.role === 'admin' || userData!.role === 'manager') {
      // Admin and Manager can see all teams
      // No additional filtering needed
    } else if (userData!.role === 'player') {
      // Players can only see their own team
      if (!userData!.team_id) {
        return NextResponse.json(
          { error: 'Player must be assigned to a team to view team data' },
          { status: 403 }
        )
      }
      query = query.eq('id', userData!.team_id)
    } else {
      // Coach, Analyst - can only see their assigned team
      if (userData!.team_id) {
        query = query.eq('id', userData!.team_id)
      } else {
        // If no team assigned, return empty array
        return NextResponse.json([])
      }
    }

    const { data: teams, error: teamsError } = await query

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    return NextResponse.json(teams || [])

  } catch (error) {
    console.error('Error in teams API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}