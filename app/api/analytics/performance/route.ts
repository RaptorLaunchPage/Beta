import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createWrappedSuccessResponse, 
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
    const requestedType = (searchParams.get('type') || 'overview').toLowerCase()
    const analysisType = requestedType === 'comparison' ? 'team' : requestedType
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
        analysisType === 'overview' || analysisType === 'team' || analysisType === 'trends'
          ? 'kills,damage,survival_time,placement,created_at,player_id,team_id,map, users:player_id(id, name, email), teams:team_id(id, name)'
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

    // Construct UI-friendly data based on requested analysis type
    const perfArray = performances || []

    if (analysisType === 'player') {
      const data = buildPlayerSectionData(perfArray)
      return createWrappedSuccessResponse(data)
    }

    if (analysisType === 'team') {
      const data = buildTeamComparisonData(perfArray)
      return createWrappedSuccessResponse(data)
    }

    if (analysisType === 'trends') {
      const data = buildTrendSectionData(perfArray)
      return createWrappedSuccessResponse(data)
    }

    // Default overview fallback
    const overview = calculateOverviewAnalytics(perfArray)
    return createWrappedSuccessResponse(overview)

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

// Builders to match UI expectations
function buildPlayerSectionData(performances: any[]) {
  // Aggregate player-level stats
  const totalMatches = performances.length
  const totalKills = performances.reduce((s, p) => s + (p.kills || 0), 0)
  const totalDamage = performances.reduce((s, p) => s + (p.damage || 0), 0)
  const totalPlacement = performances.reduce((s, p) => s + (p.placement || 0), 0)

  const playerStats = {
    totalMatches,
    avgKills: totalMatches ? +(totalKills / totalMatches).toFixed(2) : 0,
    avgDamage: totalMatches ? Math.round(totalDamage / totalMatches) : 0,
    avgPlacement: totalMatches ? Math.round(totalPlacement / totalMatches) : 0
  }

  // Radar data example
  const radarData = [
    { metric: 'Kills', value: playerStats.avgKills },
    { metric: 'Damage', value: playerStats.avgDamage / 100 },
    { metric: 'Placement', value: Math.max(0, 10 - playerStats.avgPlacement) }
  ]

  // Performance trend (last 10)
  const performanceTrend = performances.slice(0, 10).map((p, idx) => ({
    match: `#${performances.length - idx}`,
    kills: p.kills || 0,
    damage: p.damage || 0,
    placement: p.placement || 0,
    assists: p.assists || 0,
    survival: Math.round((p.survival_time || 0) / 60)
  })).reverse()

  // Player options (for staff views)
  const playersMap = new Map<string, any>()
  performances.forEach(p => {
    const id = p.player_id
    const name = p.users?.name || p.users?.email || 'Player'
    if (!id) return
    if (!playersMap.has(id)) playersMap.set(id, { id, name })
  })
  const topPerformers = { players: Array.from(playersMap.values()) }

  // AI-style insights
  const insights: Array<{ category: string; title: string; description: string }> = []

  if (totalMatches > 0) {
    // Overall average-based insight
    insights.push({
      category: 'overview',
      title: playerStats.avgKills >= 5 ? 'High Kill Rate' : 'Developing Kill Rate',
      description: `Averaging ${playerStats.avgKills} kills per match across ${totalMatches} matches.`
    })

    // Recent trend: last 5 vs previous 5
    const lastFive = performances.slice(0, 5)
    const prevFive = performances.slice(5, 10)
    if (lastFive.length > 0 && prevFive.length > 0) {
      const lastFiveAvg = +(lastFive.reduce((s, p) => s + (p.kills || 0), 0) / lastFive.length).toFixed(2)
      const prevFiveAvg = +(prevFive.reduce((s, p) => s + (p.kills || 0), 0) / prevFive.length).toFixed(2)
      const diff = +(lastFiveAvg - prevFiveAvg).toFixed(2)
      insights.push({
        category: 'trend',
        title: diff >= 0 ? 'Improving Recent Form' : 'Recent Dip in Kills',
        description: `${diff >= 0 ? '+' : ''}${diff} avg kills compared to the previous 5 matches.`
      })
    }

    // Best map by average kills
    const mapAgg = new Map<string, { kills: number; matches: number }>()
    performances.forEach(p => {
      const m = p.map || 'Unknown'
      const e = mapAgg.get(m) || { kills: 0, matches: 0 }
      e.kills += p.kills || 0
      e.matches += 1
      mapAgg.set(m, e)
    })
    const bestMap = Array.from(mapAgg.entries())
      .map(([map, v]) => ({ map, avg: v.kills / Math.max(1, v.matches) }))
      .sort((a, b) => b.avg - a.avg)[0]
    if (bestMap) {
      insights.push({
        category: 'map',
        title: 'Best Performing Map',
        description: `${bestMap.map} with ${(bestMap.avg).toFixed(2)} avg kills.`
      })
    }
  }

  // Recent matches
  const recentMatches = performanceTrend

  return {
    playerStats,
    radarData,
    performanceTrend,
    topPerformers,
    insights,
    recentMatches
  }
}

function buildTeamComparisonData(performances: any[]) {
  const teamAgg = new Map<string, any>()
  performances.forEach(p => {
    if (!p.team_id) return
    const key = p.team_id
    if (!teamAgg.has(key)) {
      teamAgg.set(key, {
        teamId: key,
        teamName: p.teams?.name || 'Team',
        matches: 0,
        totalKills: 0,
        totalDamage: 0,
        wins: 0,
        placements: 0
      })
    }
    const a = teamAgg.get(key)
    a.matches += 1
    a.totalKills += p.kills || 0
    a.totalDamage += p.damage || 0
    a.wins += (p.placement === 1 ? 1 : 0)
    a.placements += p.placement || 0
  })

  const teamComparison = Array.from(teamAgg.values()).map(a => ({
    teamId: a.teamId,
    teamName: a.teamName,
    matches: a.matches,
    avgKills: +(a.totalKills / Math.max(1, a.matches)).toFixed(2),
    avgDamage: Math.round(a.totalDamage / Math.max(1, a.matches)),
    winRate: +((a.wins / Math.max(1, a.matches)) * 100).toFixed(1),
    avgPlacement: Math.round(a.placements / Math.max(1, a.matches))
  }))

  // Top performers across teams
  const mostKills = [...teamComparison].sort((a, b) => b.avgKills - a.avgKills)[0]
  const mostDamage = [...teamComparison].sort((a, b) => b.avgDamage - a.avgDamage)[0]
  const bestWinRate = [...teamComparison].sort((a, b) => b.winRate - a.winRate)[0]

  const topPerformers = {
    mostKills,
    mostDamage,
    bestWinRate
  }

  // Insights for teams
  const insights: Array<{ category: string; title: string; description: string }> = []
  if (mostKills) {
    insights.push({
      category: 'kills',
      title: 'Top Team by Avg Kills',
      description: `${mostKills.teamName}: ${mostKills.avgKills} avg kills per match.`
    })
  }
  if (mostDamage) {
    insights.push({
      category: 'damage',
      title: 'Highest Avg Damage Team',
      description: `${mostDamage.teamName}: ${mostDamage.avgDamage} avg damage.`
    })
  }
  if (bestWinRate) {
    insights.push({
      category: 'winrate',
      title: 'Best Win Rate',
      description: `${bestWinRate.teamName}: ${bestWinRate.winRate}% win rate.`
    })
  }

  return {
    topPerformers,
    teamComparison,
    insights
  }
}

function buildTrendSectionData(performances: any[]) {
  // Group by date
  const dayMap = new Map<string, { kills: number; matches: number }>()
  performances.forEach(p => {
    const d = new Date(p.created_at)
    const key = d.toISOString().split('T')[0]
    const entry = dayMap.get(key) || { kills: 0, matches: 0 }
    entry.kills += p.kills || 0
    entry.matches += 1
    dayMap.set(key, entry)
  })

  const days = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const trendData = days.map(([date, v]) => ({ date, avgKills: +(v.kills / Math.max(1, v.matches)).toFixed(2) }))

  const summary = {
    totalDays: days.length,
    bestDay: days.sort((a, b) => (b[1].kills / Math.max(1, b[1].matches)) - (a[1].kills / Math.max(1, a[1].matches)))[0]
      ? { date: days[0][0], avgKills: +(days[0][1].kills / Math.max(1, days[0][1].matches)).toFixed(2) }
      : null,
    improvements: {
      kills: trendData.length > 1 ? +(trendData[trendData.length - 1].avgKills - trendData[0].avgKills).toFixed(2) : 0
    }
  }

  const insights: Array<{ category: string; title: string; description: string }> = []
  if (trendData.length > 1) {
    const diff = +(trendData[trendData.length - 1].avgKills - trendData[0].avgKills).toFixed(2)
    insights.push({
      category: 'trend',
      title: diff >= 0 ? 'Positive Kill Trend' : 'Negative Kill Trend',
      description: `${diff >= 0 ? '+' : ''}${diff} avg kills over the selected period.`
    })
  }
  if (summary.bestDay) {
    insights.push({
      category: 'best-day',
      title: 'Best Day Identified',
      description: `${summary.bestDay.date} with ${summary.bestDay.avgKills} avg kills.`
    })
  }

  return {
    summary,
    trendData,
    insights
  }
}