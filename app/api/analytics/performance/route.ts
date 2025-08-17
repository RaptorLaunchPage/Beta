import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  isValidUuid,
  handleCors
} from '@/lib/api-utils'

// GET - Advanced Performance Analytics
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
    const timeframe = searchParams.get('timeframe') || '30'
    const teamId = searchParams.get('teamId')
    const playerId = searchParams.get('playerId')
    const analysisType = searchParams.get('type') || 'overview'
    const limitParam = parseInt(searchParams.get('limit') || '0')
    const limit = limitParam > 0 ? Math.min(limitParam, 1000) : 0

    // Validate UUIDs if provided
    if (teamId && !isValidUuid(teamId)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    if (playerId && !isValidUuid(playerId)) {
      return createErrorResponse({
        error: 'Invalid player ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    // Build performance query with role-based filtering
    let performanceQuery = supabase
      .from('performances')
      .select(
        analysisType === 'overview' || analysisType === 'team'
          ? 'kills,damage,survival_time,placement,created_at,player_id,team_id,map'
          : '*, users:player_id(id, name, email), teams:team_id(id, name)'
      )
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Apply role-based access control
    if (user.role === 'player') {
      if (user.team_id) {
        performanceQuery = performanceQuery.or(`player_id.eq.${user.id},team_id.eq.${user.team_id}`)
      } else {
        performanceQuery = performanceQuery.eq('player_id', user.id)
      }
    } else if (user.role === 'coach' && user.team_id) {
      performanceQuery = performanceQuery.eq('team_id', user.team_id)
    } else if (user.role === 'analyst' && user.team_id) {
      performanceQuery = performanceQuery.eq('team_id', user.team_id)
    }

    // Apply additional filters
    if (teamId) {
      performanceQuery = performanceQuery.eq('team_id', teamId)
    }

    if (playerId) {
      performanceQuery = performanceQuery.eq('player_id', playerId)
    }

    if (limit > 0) {
      performanceQuery = performanceQuery.limit(limit)
    }

    const { data: performances, error: perfError } = await performanceQuery.order('created_at', { ascending: false })

    if (perfError) {
      console.error('Error fetching performances:', perfError)
      return createErrorResponse({
        error: 'Failed to fetch performance data',
        code: 'DATABASE_ERROR',
        status: 500,
        details: perfError.message
      })
    }

    // Calculate analytics based on analysis type
    let analytics = {}
    
    if (analysisType === 'overview') {
      analytics = calculateOverviewAnalytics(performances || [])
    } else if (analysisType === 'team') {
      analytics = calculateTeamAnalytics(performances || [])
    } else if (analysisType === 'player') {
      analytics = calculatePlayerAnalytics(performances || [])
    }

    return createSuccessResponse({
      performances: performances || [],
      analytics,
      timeframe: parseInt(timeframe),
      filters: {
        teamId,
        playerId,
        analysisType
      }
    })

  } catch (error) {
    console.error('Error in analytics API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// Helper functions for analytics calculations
function calculateOverviewAnalytics(performances: any[]) {
  if (performances.length === 0) {
    return {
      totalMatches: 0,
      averageKills: 0,
      averageDamage: 0,
      averageSurvivalTime: 0,
      winRate: 0,
      topPerformers: []
    }
  }

  const totalMatches = performances.length
  const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
  const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
  const totalSurvivalTime = performances.reduce((sum, p) => sum + (p.survival_time || 0), 0)
  const wins = performances.filter(p => p.placement === 1).length

  // Calculate top performers
  const playerStats = new Map()
  performances.forEach(p => {
    if (!playerStats.has(p.player_id)) {
      playerStats.set(p.player_id, {
        player_id: p.player_id,
        totalKills: 0,
        totalDamage: 0,
        matches: 0,
        wins: 0
      })
    }
    const stats = playerStats.get(p.player_id)
    stats.totalKills += p.kills || 0
    stats.totalDamage += p.damage || 0
    stats.matches += 1
    if (p.placement === 1) stats.wins += 1
  })

  const topPerformers = Array.from(playerStats.values())
    .sort((a, b) => b.totalKills - a.totalKills)
    .slice(0, 5)

  return {
    totalMatches,
    averageKills: totalKills / totalMatches,
    averageDamage: totalDamage / totalMatches,
    averageSurvivalTime: totalSurvivalTime / totalMatches,
    winRate: (wins / totalMatches) * 100,
    topPerformers
  }
}

function calculateTeamAnalytics(performances: any[]) {
  if (performances.length === 0) {
    return {
      teamStats: {},
      teamRankings: []
    }
  }

  const teamStats = new Map()
  performances.forEach(p => {
    if (!p.team_id) return
    
    if (!teamStats.has(p.team_id)) {
      teamStats.set(p.team_id, {
        team_id: p.team_id,
        totalKills: 0,
        totalDamage: 0,
        matches: 0,
        wins: 0,
        averagePlacement: 0
      })
    }
    
    const stats = teamStats.get(p.team_id)
    stats.totalKills += p.kills || 0
    stats.totalDamage += p.damage || 0
    stats.matches += 1
    if (p.placement === 1) stats.wins += 1
    stats.averagePlacement += p.placement || 0
  })

  // Calculate averages
  teamStats.forEach(stats => {
    stats.averageKills = stats.totalKills / stats.matches
    stats.averageDamage = stats.totalDamage / stats.matches
    stats.averagePlacement = stats.averagePlacement / stats.matches
    stats.winRate = (stats.wins / stats.matches) * 100
  })

  const teamRankings = Array.from(teamStats.values())
    .sort((a, b) => b.averageKills - a.averageKills)

  return {
    teamStats: Object.fromEntries(teamStats),
    teamRankings
  }
}

function calculatePlayerAnalytics(performances: any[]) {
  if (performances.length === 0) {
    return {
      playerStats: {},
      playerRankings: []
    }
  }

  const playerStats = new Map()
  performances.forEach(p => {
    if (!playerStats.has(p.player_id)) {
      playerStats.set(p.player_id, {
        player_id: p.player_id,
        player_name: p.users?.name || 'Unknown',
        totalKills: 0,
        totalDamage: 0,
        matches: 0,
        wins: 0,
        averagePlacement: 0,
        bestKills: 0,
        bestDamage: 0
      })
    }
    
    const stats = playerStats.get(p.player_id)
    stats.totalKills += p.kills || 0
    stats.totalDamage += p.damage || 0
    stats.matches += 1
    if (p.placement === 1) stats.wins += 1
    stats.averagePlacement += p.placement || 0
    stats.bestKills = Math.max(stats.bestKills, p.kills || 0)
    stats.bestDamage = Math.max(stats.bestDamage, p.damage || 0)
  })

  // Calculate averages
  playerStats.forEach(stats => {
    stats.averageKills = stats.totalKills / stats.matches
    stats.averageDamage = stats.totalDamage / stats.matches
    stats.averagePlacement = stats.averagePlacement / stats.matches
    stats.winRate = (stats.wins / stats.matches) * 100
  })

  const playerRankings = Array.from(playerStats.values())
    .sort((a, b) => b.averageKills - a.averageKills)

  return {
    playerStats: Object.fromEntries(playerStats),
    playerRankings
  }
}