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

// GET - Fetch attendance heatmap data
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
    const days = parseInt(searchParams.get('days') || '30')
    const teamId = searchParams.get('team_id')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    let query = userSupabase!
      .from('attendances')
      .select(`
        date,
        session_time,
        team_id,
        status,
        teams:team_id(name)
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Apply role-based filtering
    if (userData!.role === 'coach' && userData!.team_id) {
      query = query.eq('team_id', userData!.team_id)
    } else if (userData!.role === 'player') {
      query = query.eq('player_id', userData!.id)
    } else if (teamId && ['admin', 'manager'].includes(userData!.role)) {
      query = query.eq('team_id', teamId)
    }

    const { data: attendances, error: queryError } = await query.order('date')

    if (queryError) {
      console.error('Error fetching attendance data:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch attendance data' },
        { status: 500 }
      )
    }

    // Process data into heatmap format
    const heatmapData = []
    const sessionTypes = ['Morning', 'Evening', 'Night']
    
    // Group by team and session type
    const groupedData: Record<string, Record<string, { total: number, attended: number }>> = {}

    for (const attendance of attendances || []) {
      const teamKey = attendance.team_id || 'global'
      const sessionType = attendance.session_time || 'Unknown'
      
      if (!groupedData[teamKey]) {
        groupedData[teamKey] = {}
      }
      
      if (!groupedData[teamKey][sessionType]) {
        groupedData[teamKey][sessionType] = { total: 0, attended: 0 }
      }
      
      groupedData[teamKey][sessionType].total++
      if (['present', 'auto'].includes(attendance.status)) {
        groupedData[teamKey][sessionType].attended++
      }
    }

    // Convert to heatmap format
    for (const [teamId, sessions] of Object.entries(groupedData)) {
      for (const [sessionType, stats] of Object.entries(sessions)) {
        heatmapData.push({
          team_id: teamId === 'global' ? null : teamId,
          session_subtype: sessionType,
          total_sessions: stats.total,
          attended_sessions: stats.attended,
          attendance_rate: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0,
          is_global: teamId === 'global'
        })
      }
    }

    // Add default entries for missing combinations if needed
    if (userData!.role === 'admin' || userData!.role === 'manager') {
      // Get all teams
      const { data: teams } = await userSupabase!
        .from('teams')
        .select('id, name')
        .eq('status', 'active')

      for (const team of teams || []) {
        for (const sessionType of sessionTypes) {
          const existing = heatmapData.find(h => h.team_id === team.id && h.session_subtype === sessionType)
          if (!existing) {
            heatmapData.push({
              team_id: team.id,
              session_subtype: sessionType,
              total_sessions: 0,
              attended_sessions: 0,
              attendance_rate: 0,
              is_global: false
            })
          }
        }
      }
    }

    return NextResponse.json({
      heatmap: heatmapData,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days
      }
    })

  } catch (error) {
    console.error('Error in attendance heatmap API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}