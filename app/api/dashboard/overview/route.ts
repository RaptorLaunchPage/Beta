import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

function getDatesForTimeframe(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

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

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) {
      return NextResponse.json({ error: error || 'Service unavailable' }, { status: status || 500 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const { start, end } = getDatesForTimeframe(timeframe)

    // Build queries with minimal column projections
    let perfQuery = userSupabase
      .from('performances')
      .select('kills,damage,survival_time,placement,created_at', { count: 'exact' })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Role-based filter for performances
    if (userData.role === 'player') {
      if (userData.team_id) {
        perfQuery = perfQuery.or(`player_id.eq.${userData.id},team_id.eq.${userData.team_id}`)
      } else {
        perfQuery = perfQuery.eq('player_id', userData.id)
      }
    } else if (['coach', 'analyst'].includes(userData.role) && userData.team_id) {
      perfQuery = perfQuery.eq('team_id', userData.team_id)
    }

    // Finance queries (minimal columns)
    let expenseQuery = userSupabase
      .from('slot_expenses')
      .select('total, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    let winningsQuery = userSupabase
      .from('winnings')
      .select('amount_won, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['coach', 'analyst', 'player'].includes(userData.role) && userData.team_id) {
      expenseQuery = expenseQuery.eq('team_id', userData.team_id)
      winningsQuery = winningsQuery.eq('team_id', userData.team_id)
    }

    // Admin/manager only queries
    const teamsQuery = ['admin', 'manager'].includes(userData.role)
      ? userSupabase.from('teams').select('id').eq('status', 'active')
      : null
    const usersQuery = ['admin', 'manager'].includes(userData.role)
      ? userSupabase.from('users').select('id').neq('role', 'pending_player').neq('role', 'awaiting_approval')
      : null

    // Attendance query (minimal columns)
    let attendanceQuery = userSupabase
      .from('attendances')
      .select('status, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['coach', 'analyst', 'player'].includes(userData.role) && userData.team_id) {
      attendanceQuery = attendanceQuery.eq('team_id', userData.team_id)
    }

    // Execute in parallel
    const [perfRes, expenseRes, winningsRes, teamsRes, usersRes, attendanceRes] = await Promise.all([
      perfQuery,
      expenseQuery,
      winningsQuery,
      teamsQuery,
      usersQuery,
      attendanceQuery
    ])

    const performances = perfRes.data || []
    const totalMatches = perfRes.count || performances.length || 0
    const totalKills = performances.reduce((s: number, p: any) => s + (p.kills || 0), 0)
    const totalDamage = performances.reduce((s: number, p: any) => s + (p.damage || 0), 0)
    const totalSurvival = performances.reduce((s: number, p: any) => s + (p.survival_time || 0), 0)

    const today = new Date(); today.setHours(0,0,0,0)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const todayMatches = performances.filter((p: any) => new Date(p.created_at) >= today).length
    const weekMatches = performances.filter((p: any) => new Date(p.created_at) >= weekAgo).length
    const placements = performances.map((p: any) => p.placement).filter((p: any) => (p ?? 0) > 0)
    const avgPlacement = placements.length > 0 ? Math.round(placements.reduce((a: number, b: number) => a + (b || 0), 0) / placements.length) : 0

    const expenses = expenseRes.data || []
    const winnings = winningsRes.data || []
    const totalExpense = expenses.reduce((sum: number, e: any) => sum + (e.total || 0), 0)
    const totalWinnings = winnings.reduce((sum: number, w: any) => sum + (w.amount_won || 0), 0)
    const totalProfitLoss = totalWinnings - totalExpense

    const activeTeams = teamsRes && Array.isArray(teamsRes.data) ? teamsRes.data.length : 0
    const activePlayers = usersRes && Array.isArray(usersRes.data) ? usersRes.data.length : 0

    const attendanceRows = attendanceRes.data || []
    const totalSessions = attendanceRows.length
    const attended = attendanceRows.filter((a: any) => ['present', 'late', 'auto'].includes(a.status)).length
    const overallAttendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalMatches,
        totalKills,
        avgDamage: totalMatches ? totalDamage / totalMatches : 0,
        avgSurvival: totalMatches ? totalSurvival / totalMatches : 0,
        kdRatio: totalMatches ? totalKills / totalMatches : 0,
        avgPlacement,
        todayMatches,
        weekMatches,
        totalExpense,
        totalProfitLoss,
        activeTeams,
        activePlayers,
        overallAttendanceRate
      }
    })
  } catch (error: any) {
    console.error('Error in dashboard overview API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}