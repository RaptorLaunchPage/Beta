import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Validate API key middleware
function validateBotApiKey(request: NextRequest) {
  const apiKey = request.headers.get('authorization')
  const expectedKey = `Bearer ${process.env.RAPTOR_BOT_API_KEY}`
  
  if (!apiKey || apiKey !== expectedKey) {
    return false
  }
  return true
}

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const guild_id = searchParams.get('guild_id')
    const limit = parseInt(searchParams.get('limit') || '10')
    const days = parseInt(searchParams.get('days') || '30')

    if (!guild_id) {
      return NextResponse.json({ 
        error: 'Missing required parameter: guild_id' 
      }, { status: 400 })
    }

    // Get team info from guild
    const { data: discordServer, error: serverError } = await supabase
      .from('discord_servers')
      .select('connected_team_id, name')
      .eq('guild_id', guild_id)
      .single()

    if (serverError) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Calculate date range
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    // Get recent performance records
    const { data: performanceRecords, error: perfError } = await supabase
      .from('performance_records')
      .select(`
        *,
        discord_users!inner(user_id, username)
      `)
      .eq('guild_id', guild_id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (perfError) {
      console.error('Error fetching performance records:', perfError)
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
    }

    // Calculate team statistics
    const totalMatches = performanceRecords.length
    const totalKills = performanceRecords.reduce((sum, record) => sum + (record.kills || 0), 0)
    const totalDamage = performanceRecords.reduce((sum, record) => sum + (record.damage || 0), 0)
    const avgPlacement = totalMatches > 0 
      ? performanceRecords.reduce((sum, record) => sum + (record.placement || 100), 0) / totalMatches
      : 0

    // Calculate per-player statistics
    const playerStats = performanceRecords.reduce((acc: any, record) => {
      const playerId = record.discord_id
      if (!acc[playerId]) {
        acc[playerId] = {
          discord_id: playerId,
          username: record.discord_users?.username || 'Unknown',
          matches: 0,
          kills: 0,
          damage: 0,
          placements: [],
          best_placement: 100
        }
      }
      
      acc[playerId].matches += 1
      acc[playerId].kills += record.kills || 0
      acc[playerId].damage += record.damage || 0
      acc[playerId].placements.push(record.placement || 100)
      acc[playerId].best_placement = Math.min(acc[playerId].best_placement, record.placement || 100)
      
      return acc
    }, {})

    // Calculate averages and sort players
    const topPlayers = Object.values(playerStats).map((player: any) => ({
      ...player,
      avg_kills: player.matches > 0 ? (player.kills / player.matches).toFixed(1) : '0.0',
      avg_damage: player.matches > 0 ? Math.round(player.damage / player.matches) : 0,
      avg_placement: player.matches > 0 
        ? (player.placements.reduce((sum: number, p: number) => sum + p, 0) / player.matches).toFixed(1)
        : '100.0'
    })).sort((a, b) => parseFloat(a.avg_placement) - parseFloat(b.avg_placement))

    // Get recent matches for timeline
    const recentMatches = performanceRecords
      .slice(0, limit)
      .map(record => ({
        match_id: record.match_id,
        player: record.discord_users?.username || 'Unknown',
        kills: record.kills,
        damage: record.damage,
        placement: record.placement,
        map: record.map_name,
        created_at: record.created_at
      }))

    return NextResponse.json({
      success: true,
      team_info: {
        guild_id,
        team_name: discordServer.name || 'Unknown Team',
        team_id: discordServer.connected_team_id
      },
      statistics: {
        total_matches: totalMatches,
        total_kills: totalKills,
        total_damage: totalDamage,
        avg_kills_per_match: totalMatches > 0 ? (totalKills / totalMatches).toFixed(1) : '0.0',
        avg_damage_per_match: totalMatches > 0 ? Math.round(totalDamage / totalMatches) : 0,
        avg_placement: avgPlacement.toFixed(1),
        days_analyzed: days
      },
      top_players: topPlayers.slice(0, 5),
      recent_matches: recentMatches,
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Team performance fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}