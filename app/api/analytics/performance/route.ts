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
    .select('id, role, team_id, name')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userSupabase }
}

// GET - Advanced Performance Analytics
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

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30'
    const teamId = searchParams.get('teamId')
    const playerId = searchParams.get('playerId')
    const analysisType = searchParams.get('type') || 'overview'
    const limitParam = parseInt(searchParams.get('limit') || '0')
    const limit = limitParam > 0 ? Math.min(limitParam, 1000) : 0

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    // Build performance query with role-based filtering
    let performanceQuery = userSupabase
      .from('performances')
      .select(
        analysisType === 'overview' || analysisType === 'team'
          ? 'kills,damage,survival_time,placement,created_at,player_id,team_id,map'
          : '*, users:player_id(id, name, email), teams:team_id(id, name)'
      )
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Apply role-based access control
    if (userData.role === 'player') {
      if (userData.team_id) {
        performanceQuery = performanceQuery.or(`player_id.eq.${userData.id},team_id.eq.${userData.team_id}`)
      } else {
        performanceQuery = performanceQuery.eq('player_id', userData.id)
      }
    } else if (userData.role === 'coach' && userData.team_id) {
      performanceQuery = performanceQuery.eq('team_id', userData.team_id)
    } else if (userData.role === 'analyst' && userData.team_id) {
      performanceQuery = performanceQuery.eq('team_id', userData.team_id)
    }
    // Admins and managers can see all data

    // Apply additional filters
    if (teamId && (userData.role === 'admin' || userData.role === 'manager')) {
      performanceQuery = performanceQuery.eq('team_id', teamId)
    }
    if (playerId) {
      performanceQuery = performanceQuery.eq('player_id', playerId)
    }

    let finalQuery = performanceQuery.order('created_at', { ascending: false })
    if (limit > 0) {
      finalQuery = finalQuery.limit(limit)
    }
    const { data: performances, error: perfError } = await finalQuery

    if (perfError) {
      throw new Error(`Failed to fetch performance data: ${perfError.message}`)
    }

    // Process data based on analysis type
    let analyticsData: any = {}

    switch (analysisType) {
      case 'trends':
        analyticsData = generateTrendAnalysis(performances || [])
        break
      case 'comparison':
        analyticsData = generateComparisonAnalysis(performances || [])
        break
      case 'player':
        analyticsData = generatePlayerAnalysis(performances || [], playerId || undefined)
        break
      case 'team':
        analyticsData = generateTeamAnalysis(performances || [])
        break
      case 'maps':
        analyticsData = generateMapAnalysis(performances || [])
        break
      default:
        analyticsData = generateOverviewAnalysis(performances || [])
    }

    // Curated insights based on filtered dataset
    analyticsData.insights = generateInsights(performances || [], analysisType)

    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        totalRecords: performances?.length || 0,
        timeframe,
        analysisType,
        userRole: userData.role
      }
    })

  } catch (error: any) {
    console.error('Error in performance analytics API:', error)
    return NextResponse.json(
      { error: `Analytics error: ${error.message}` },
      { status: 500 }
    )
  }
}

// Generate trend analysis data
function generateTrendAnalysis(performances: any[]) {
  const groupedByDate = new Map()
  
  performances.forEach(perf => {
    const date = new Date(perf.created_at).toLocaleDateString()
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, {
        date,
        matches: 0,
        totalKills: 0,
        totalDamage: 0,
        totalSurvival: 0,
        placements: []
      })
    }
    
    const dayData = groupedByDate.get(date)
    dayData.matches++
    dayData.totalKills += perf.kills || 0
    dayData.totalDamage += perf.damage || 0
    dayData.totalSurvival += perf.survival_time || 0
    dayData.placements.push(perf.placement || 0)
  })

  const trendData = Array.from(groupedByDate.values()).map(day => ({
    date: day.date,
    matches: day.matches,
    avgKills: day.matches > 0 ? (day.totalKills / day.matches).toFixed(1) : '0',
    avgDamage: day.matches > 0 ? Math.round(day.totalDamage / day.matches) : 0,
    avgSurvival: day.matches > 0 ? (day.totalSurvival / day.matches).toFixed(1) : '0',
    avgPlacement: day.placements.length > 0 ? (day.placements.reduce((a: number, b: number) => a + b, 0) / day.placements.length).toFixed(1) : '0'
  }))

  return {
    trendData: trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    summary: {
      totalDays: trendData.length,
      bestDay: trendData.reduce((best, current) => 
        parseFloat(current.avgKills) > parseFloat(best.avgKills) ? current : best
      , trendData[0] || {}),
      improvements: calculateImprovements(trendData)
    }
  }
}

// Generate team comparison analysis
function generateComparisonAnalysis(performances: any[]) {
  const teamStats = new Map()
  
  performances.forEach(perf => {
    const teamId = perf.teams?.id
    const teamName = perf.teams?.name
    
    if (!teamId || !teamName) return
    
    if (!teamStats.has(teamId)) {
      teamStats.set(teamId, {
        teamId,
        teamName,
        matches: 0,
        totalKills: 0,
        totalDamage: 0,
        totalSurvival: 0,
        wins: 0,
        placements: []
      })
    }
    
    const stats = teamStats.get(teamId)
    stats.matches++
    stats.totalKills += perf.kills || 0
    stats.totalDamage += perf.damage || 0
    stats.totalSurvival += perf.survival_time || 0
    stats.placements.push(perf.placement || 0)
    if (perf.placement === 1) stats.wins++
  })

  const comparisonData = Array.from(teamStats.values()).map(team => ({
    teamName: team.teamName,
    matches: team.matches,
    avgKills: team.matches > 0 ? (team.totalKills / team.matches).toFixed(1) : '0',
    avgDamage: team.matches > 0 ? Math.round(team.totalDamage / team.matches) : 0,
    winRate: team.matches > 0 ? ((team.wins / team.matches) * 100).toFixed(1) : '0',
    avgPlacement: team.placements.length > 0 ? (team.placements.reduce((a: number, b: number) => a + b, 0) / team.placements.length).toFixed(1) : '0'
  }))

  return {
    teamComparison: comparisonData.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate)),
    topPerformers: {
      mostKills: comparisonData.reduce((max, team) => parseFloat(team.avgKills) > parseFloat(max.avgKills) ? team : max, comparisonData[0] || {}),
      mostDamage: comparisonData.reduce((max, team) => team.avgDamage > max.avgDamage ? team : max, comparisonData[0] || {}),
      bestWinRate: comparisonData.reduce((max, team) => parseFloat(team.winRate) > parseFloat(max.winRate) ? team : max, comparisonData[0] || {})
    }
  }
}

// Generate player-specific analysis
function generatePlayerAnalysis(performances: any[], playerId?: string) {
  const playerPerfs = playerId ? 
    performances.filter(p => p.player_id === playerId) : 
    performances

  if (playerPerfs.length === 0) {
    return { error: 'No performance data found for player' }
  }

  const recentMatches = playerPerfs.slice(0, 10).map((perf, index) => ({
    match: `Match ${index + 1}`,
    kills: perf.kills || 0,
    assists: perf.assists || 0,
    damage: perf.damage || 0,
    placement: perf.placement || 0,
    survival: perf.survival_time || 0
  }))

  // Calculate player radar metrics (normalized to 0-100)
  const avgKills = playerPerfs.reduce((sum, p) => sum + (p.kills || 0), 0) / playerPerfs.length
  const avgDamage = playerPerfs.reduce((sum, p) => sum + (p.damage || 0), 0) / playerPerfs.length
  const avgSurvival = playerPerfs.reduce((sum, p) => sum + (p.survival_time || 0), 0) / playerPerfs.length
  const avgPlacement = playerPerfs.reduce((sum, p) => sum + (p.placement || 0), 0) / playerPerfs.length

  const radarData = [
    { metric: 'Kills', value: Math.min(100, (avgKills / 10) * 100) },
    { metric: 'Damage', value: Math.min(100, (avgDamage / 3000) * 100) },
    { metric: 'Survival', value: Math.min(100, (avgSurvival / 30) * 100) },
    { metric: 'Placement', value: Math.max(0, 100 - (avgPlacement / 100) * 100) },
    { metric: 'Consistency', value: calculateConsistency(playerPerfs) }
  ]

  return {
    playerStats: {
      totalMatches: playerPerfs.length,
      avgKills: avgKills.toFixed(1),
      avgDamage: Math.round(avgDamage),
      avgSurvival: avgSurvival.toFixed(1),
      avgPlacement: avgPlacement.toFixed(1)
    },
    recentMatches,
    radarData,
    performanceTrend: generatePlayerTrend(playerPerfs)
  }
}

// Generate team analysis
function generateTeamAnalysis(performances: any[]) {
  const mapPerformance = new Map()
  
  performances.forEach(perf => {
    const map = perf.map || 'Unknown'
    if (!mapPerformance.has(map)) {
      mapPerformance.set(map, {
        name: map,
        matches: 0,
        totalKills: 0,
        wins: 0
      })
    }
    
    const mapStats = mapPerformance.get(map)
    mapStats.matches++
    mapStats.totalKills += perf.kills || 0
    if (perf.placement === 1) mapStats.wins++
  })

  const mapData = Array.from(mapPerformance.values()).map(map => ({
    name: map.name,
    value: map.matches,
    winRate: map.matches > 0 ? ((map.wins / map.matches) * 100).toFixed(1) : '0',
    avgKills: map.matches > 0 ? (map.totalKills / map.matches).toFixed(1) : '0'
  }))

  return {
    mapPerformance: mapData.sort((a, b) => b.value - a.value),
    teamSummary: {
      totalMatches: performances.length,
      totalWins: performances.filter(p => p.placement === 1).length,
      bestMap: mapData.reduce((best, current) => 
        parseFloat(current.winRate) > parseFloat(best.winRate) ? current : best
      , mapData[0] || {})
    }
  }
}

// Generate map analysis
function generateMapAnalysis(performances: any[]) {
  return generateTeamAnalysis(performances) // Same logic for now
}

// Generate overview analysis
function generateOverviewAnalysis(performances: any[]) {
  if (performances.length === 0) {
    return {
      overview: { totalMatches: 0, totalKills: 0, avgDamage: 0, winRate: '0' },
      topPerformers: { players: [], teams: [] }
    }
  }

  const totalMatches = performances.length
  const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
  const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
  const wins = performances.filter(p => p.placement === 1).length

  // Top players
  const playerStats = new Map()
  performances.forEach(perf => {
    const playerId = perf.users?.id
    const playerName = perf.users?.name || perf.users?.email
    
    if (!playerId || !playerName) return
    
    if (!playerStats.has(playerId)) {
      playerStats.set(playerId, {
        name: playerName,
        kills: 0,
        damage: 0,
        matches: 0
      })
    }
    
    const stats = playerStats.get(playerId)
    stats.kills += perf.kills || 0
    stats.damage += perf.damage || 0
    stats.matches += 1
  })

  const topPlayers = Array.from(playerStats.values())
    .map(player => ({
      ...player,
      avgKills: (player.kills / player.matches).toFixed(1),
      avgDamage: Math.round(player.damage / player.matches)
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5)

  return {
    overview: {
      totalMatches,
      totalKills,
      avgDamage: Math.round(totalDamage / totalMatches),
      winRate: ((wins / totalMatches) * 100).toFixed(1)
    },
    topPerformers: {
      players: topPlayers
    }
  }
}

// Helper functions
function calculateImprovements(trendData: any[]) {
  if (trendData.length < 2) return { kills: 0, damage: 0, placement: 0 }
  
  const recent = trendData.slice(-3)
  const older = trendData.slice(0, 3)
  
  const recentAvgKills = recent.reduce((sum, d) => sum + parseFloat(d.avgKills), 0) / recent.length
  const olderAvgKills = older.reduce((sum, d) => sum + parseFloat(d.avgKills), 0) / older.length
  
  return {
    kills: ((recentAvgKills - olderAvgKills) / Math.max(olderAvgKills, 1e-6) * 100).toFixed(1),
    damage: 0, // Calculate similarly
    placement: 0 // Calculate similarly
  }
}

function calculateConsistency(performances: any[]) {
  if (performances.length < 2) return 50
  
  const kills = performances.map(p => p.kills || 0)
  const avg = kills.reduce((a, b) => a + b, 0) / kills.length
  const variance = kills.reduce((sum, kill) => sum + Math.pow(kill - avg, 2), 0) / kills.length
  const stdDev = Math.sqrt(variance)
  
  // Lower std dev = higher consistency (normalized to 0-100)
  return Math.max(0, 100 - (stdDev / Math.max(avg, 1e-6) * 100))
}

function generatePlayerTrend(performances: any[]) {
  return performances.slice(0, 10).reverse().map((perf, index) => ({
    match: index + 1,
    kills: perf.kills || 0,
    damage: perf.damage || 0,
    placement: perf.placement || 0
  }))
}

// Generate curated insights based on the filtered dataset
function generateInsights(performances: any[], analysisType: string) {
  const insights: Array<{ title: string; description: string; category: string }> = []
  if (!performances || performances.length === 0) return insights

  const total = performances.length
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const kills = performances.map(p => p.kills || 0)
  const damage = performances.map(p => p.damage || 0)
  const survival = performances.map(p => p.survival_time || 0)
  const placement = performances.map(p => p.placement || 0)

  const avgKills = sum(kills) / total
  const avgDamage = sum(damage) / total
  const avgSurvival = sum(survival) / total
  const avgPlacement = sum(placement) / Math.max(total, 1)

  // Trend: compare last 5 vs previous 5
  if (total >= 8) {
    const recent = performances.slice(0, 5)
    const older = performances.slice(5, 10)
    const recentKills = recent.reduce((a, p) => a + (p.kills || 0), 0) / recent.length
    const olderKills = older.reduce((a, p) => a + (p.kills || 0), 0) / older.length
    if (recentKills > olderKills * 1.15) {
      insights.push({
        title: 'Trending Upward',
        description: 'Recent matches show a clear upward trend in kills. Double down on current strategies to sustain momentum.',
        category: 'trend'
      })
    } else if (recentKills < olderKills * 0.85) {
      insights.push({
        title: 'Performance Dip Detected',
        description: 'A recent decline in kills suggests fatigue or strategic mismatch. Consider reviewing drop locations and early rotations.',
        category: 'trend'
      })
    }
  }

  // Survival vs damage heuristic
  if (avgSurvival < 12 && avgDamage > 1200) {
    insights.push({
      title: 'High Damage, Low Survival',
      description: 'You are dealing good damage but dying early. Adopt safer early-game routes and stabilize before mid-game fights.',
      category: 'tactics'
    })
  }

  // Placement improvement needed
  if (avgPlacement > 8 && avgKills < 3) {
    insights.push({
      title: 'Placement Focus Needed',
      description: 'Average placement is low with limited kills. Prioritize zone control and disengage low-value fights to improve rankings.',
      category: 'strategy'
    })
  }

  // Consistency check
  const consistency = calculateConsistency(performances)
  if (consistency < 50) {
    insights.push({
      title: 'Inconsistent Performance',
      description: 'Match-to-match variance is high. Establish consistent drop spots and defined roles to stabilize outcomes.',
      category: 'consistency'
    })
  } else if (consistency > 80) {
    insights.push({
      title: 'Strong Consistency',
      description: 'Stable outputs across matches. Leverage this to execute planned strategies and focus on incremental improvements.',
      category: 'consistency'
    })
  }

  // Map-specific weakness (if data available)
  const byMap = new Map<string, { matches: number; kills: number; wins: number }>()
  for (const p of performances) {
    const key = p.map || 'Unknown'
    if (!byMap.has(key)) byMap.set(key, { matches: 0, kills: 0, wins: 0 })
    const m = byMap.get(key)!
    m.matches += 1
    m.kills += p.kills || 0
    if (p.placement === 1) m.wins += 1
  }
  if (byMap.size > 1) {
    const mapsArr = Array.from(byMap.entries()).map(([name, v]) => ({ name, matches: v.matches, avgKills: v.kills / Math.max(v.matches, 1), winRate: v.matches ? (v.wins / v.matches) * 100 : 0 }))
    const weakest = mapsArr.reduce((min, cur) => (cur.winRate < min.winRate ? cur : min), mapsArr[0])
    if (weakest.matches !== performances.length) {
      insights.push({
        title: `Map Opportunity: ${weakest.name}`,
        description: `Win rate is lower on ${weakest.name}. Consider targeted scrims and VOD review to improve rotations and timings on this map.`,
        category: 'map'
      })
    }
  }

  return insights
}