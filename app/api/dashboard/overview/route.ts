import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  handleCors
} from '@/lib/api-utils'

function getDatesForTimeframe(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

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
    const { start, end } = getDatesForTimeframe(timeframe)

    // Build queries with minimal column projections
    let perfQuery = supabase
      .from('performances')
      .select('kills,damage,survival_time,placement,created_at', { count: 'exact' })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Role-based filter for performances
    if (user.role === 'player') {
      if (user.team_id) {
        perfQuery = perfQuery.or(`player_id.eq.${user.id},team_id.eq.${user.team_id}`)
      } else {
        perfQuery = perfQuery.eq('player_id', user.id)
      }
    } else if (['coach', 'analyst'].includes(user.role) && user.team_id) {
      perfQuery = perfQuery.eq('team_id', user.team_id)
    }

    // Finance queries (minimal columns)
    let expenseQuery = supabase
      .from('slot_expenses')
      .select('total, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    let winningsQuery = supabase
      .from('winnings')
      .select('amount_won, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['coach', 'analyst', 'player'].includes(user.role) && user.team_id) {
      expenseQuery = expenseQuery.eq('team_id', user.team_id)
      winningsQuery = winningsQuery.eq('team_id', user.team_id)
    }

    // Additional queries for org-wide aggregates
    let playersQuery = supabase
      .from('users')
      .select('id, role, team_id')

    let teamsQuery = supabase
      .from('teams')
      .select('id, status')

    // Scope non-admin/manager to their team
    if (['coach', 'analyst', 'player'].includes(user.role) && user.team_id) {
      playersQuery = playersQuery.eq('team_id', user.team_id)
      teamsQuery = teamsQuery.eq('id', user.team_id)
    }

    // Execute all queries in parallel
    const [perfRes, expenseRes, winningsRes, playersRes, teamsRes] = await Promise.all([
      perfQuery,
      expenseQuery,
      winningsQuery,
      playersQuery,
      teamsQuery
    ])

    // Handle performance data
    if (perfRes.error) {
      console.error('Performance query error:', perfRes.error)
      return createErrorResponse({
        error: 'Failed to fetch performance data',
        code: 'DATABASE_ERROR',
        status: 500,
        details: perfRes.error.message
      })
    }

    // Handle expense data
    if (expenseRes.error) {
      console.error('Expense query error:', expenseRes.error)
      return createErrorResponse({
        error: 'Failed to fetch expense data',
        code: 'DATABASE_ERROR',
        status: 500,
        details: expenseRes.error.message
      })
    }

    // Handle winnings data
    if (winningsRes.error) {
      console.error('Winnings query error:', winningsRes.error)
      return createErrorResponse({
        error: 'Failed to fetch winnings data',
        code: 'DATABASE_ERROR',
        status: 500,
        details: winningsRes.error.message
      })
    }

    // Calculate metrics
    const performances = perfRes.data || []
    const expenses = expenseRes.data || []
    const winnings = winningsRes.data || []
    const usersData = playersRes.error ? [] : (playersRes.data || [])
    const teamsData = teamsRes.error ? [] : (teamsRes.data || [])

    const totalMatches = performances.length
    const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
    const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
    const totalSurvivalTime = performances.reduce((sum, p) => sum + (p.survival_time || 0), 0)
    const wins = performances.filter(p => p.placement === 1).length

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.total || 0), 0)
    const totalWinnings = winnings.reduce((sum, w) => sum + (w.amount_won || 0), 0)
    const netProfit = totalWinnings - totalExpenses

    // Calculate averages
    const avgKills = totalMatches > 0 ? totalKills / totalMatches : 0
    const avgDamage = totalMatches > 0 ? totalDamage / totalMatches : 0
    const avgSurvivalTime = totalMatches > 0 ? totalSurvivalTime / totalMatches : 0
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0

    // Performance trends (last 7 days vs previous 7 days)
    const last7Days = performances.filter(p => {
      const date = new Date(p.created_at)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return date >= sevenDaysAgo
    })

    const previous7Days = performances.filter(p => {
      const date = new Date(p.created_at)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      return date >= fourteenDaysAgo && date < sevenDaysAgo
    })

    const last7AvgKills = last7Days.length > 0 ? last7Days.reduce((sum, p) => sum + (p.kills || 0), 0) / last7Days.length : 0
    const prev7AvgKills = previous7Days.length > 0 ? previous7Days.reduce((sum, p) => sum + (p.kills || 0), 0) / previous7Days.length : 0
    const killsTrend = prev7AvgKills > 0 ? ((last7AvgKills - prev7AvgKills) / prev7AvgKills) * 100 : 0

    // Today and week match counts
    const today = new Date(); today.setHours(0,0,0,0)
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const todayMatches = performances.filter(p => new Date(p.created_at) >= today).length
    const weekMatches = performances.filter(p => new Date(p.created_at) >= oneWeekAgo).length

    // Average placement
    const placements = performances.map(p => p.placement || 0).filter(v => v > 0)
    const avgPlacement = placements.length > 0 ? Math.round(placements.reduce((a, b) => a + b, 0) / placements.length) : 0

    // Active aggregates
    const activePlayers = usersData.filter((u: any) => u.role === 'player').length
    const activeTeams = teamsData.filter((t: any) => (t.status || '').toLowerCase() === 'active').length || (teamsData.length > 0 ? teamsData.length : 0)

    return createSuccessResponse({
      stats: {
        timeframe,
        metrics: {
          totalMatches,
          totalKills,
          totalDamage,
          totalSurvivalTime,
          wins,
          avgKills: Math.round(avgKills * 100) / 100,
          avgDamage: Math.round(avgDamage),
          avgSurvivalTime: Math.round(avgSurvivalTime * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          avgPlacement,
          activePlayers,
          activeTeams
        },
        financial: {
          totalExpenses,
          totalWinnings,
          netProfit
        },
        trends: {
          killsTrend: Math.round(killsTrend * 100) / 100,
          last7DaysMatches: last7Days.length,
          previous7DaysMatches: previous7Days.length,
          todayMatches,
          weekMatches
        },
        userRole: user.role
      }
    })

  } catch (error) {
    console.error('Dashboard overview error:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}