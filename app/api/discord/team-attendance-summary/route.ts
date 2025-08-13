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
    const days = parseInt(searchParams.get('days') || '30')

    if (!guild_id) {
      return NextResponse.json({ 
        error: 'Missing required parameter: guild_id' 
      }, { status: 400 })
    }

    // Get team info
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

    // Get all bot attendance records for this guild
    const { data: botAttendance, error: botError } = await supabase
      .from('bot_attendance')
      .select(`
        *,
        discord_users(username)
      `)
      .eq('guild_id', guild_id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })

    if (botError) {
      console.error('Error fetching bot attendance:', botError)
      return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 })
    }

    // Get main attendance records if team is connected
    let mainAttendance: any[] = []
    if (discordServer?.connected_team_id) {
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendances')
        .select(`
          *,
          users(name, display_name),
          sessions(id, session_type, session_subtype, title)
        `)
        .eq('team_id', discordServer.connected_team_id)
        .gte('date', dateFrom.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (!attendanceError) {
        mainAttendance = attendance || []
      }
    }

    // Combine and analyze attendance data by player
    const playerStats: { [key: string]: any } = {}

    // Process bot attendance
    botAttendance.forEach(record => {
      const playerId = record.discord_id
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          player_id: playerId,
          player_name: record.discord_users?.username || 'Unknown',
          source: 'discord',
          total_sessions: 0,
          present: 0,
          late: 0,
          absent: 0,
          recent_status: record.status
        }
      }
      
      playerStats[playerId].total_sessions++
      playerStats[playerId][record.status]++
      
      // Keep most recent status
      if (new Date(record.created_at) > new Date(playerStats[playerId].last_update || 0)) {
        playerStats[playerId].recent_status = record.status
        playerStats[playerId].last_update = record.created_at
      }
    })

    // Process main attendance records
    mainAttendance.forEach(record => {
      const playerId = record.player_id
      const playerName = record.users?.display_name || record.users?.name || 'Unknown'
      
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          player_id: playerId,
          player_name: playerName,
          source: 'crm',
          total_sessions: 0,
          present: 0,
          late: 0,
          absent: 0,
          recent_status: record.status
        }
      }
      
      playerStats[playerId].total_sessions++
      playerStats[playerId][record.status]++
      
      // Keep most recent status
      if (new Date(record.date) > new Date(playerStats[playerId].last_update || 0)) {
        playerStats[playerId].recent_status = record.status
        playerStats[playerId].last_update = record.date
      }
    })

    // Calculate team statistics
    const allPlayers = Object.values(playerStats).map((player: any) => {
      const attendanceRate = player.total_sessions > 0 
        ? ((player.present + player.late) / player.total_sessions * 100).toFixed(1)
        : '0.0'
      
      return {
        ...player,
        attendance_rate: parseFloat(attendanceRate),
        attendance_rate_formatted: `${attendanceRate}%`
      }
    })

    // Sort players by attendance rate (best first)
    const sortedPlayers = allPlayers.sort((a, b) => b.attendance_rate - a.attendance_rate)

    // Calculate team averages
    const totalPlayers = allPlayers.length
    const totalSessions = allPlayers.reduce((sum, player) => sum + player.total_sessions, 0)
    const totalPresent = allPlayers.reduce((sum, player) => sum + player.present, 0)
    const totalLate = allPlayers.reduce((sum, player) => sum + player.late, 0)
    const totalAbsent = allPlayers.reduce((sum, player) => sum + player.absent, 0)

    const teamAttendanceRate = totalSessions > 0 
      ? ((totalPresent + totalLate) / totalSessions * 100).toFixed(1)
      : '0.0'

    // Find most consistent player (highest attendance rate with minimum sessions)
    const consistentPlayer = sortedPlayers.find(player => player.total_sessions >= 3) || sortedPlayers[0]

    // Recent team activity
    const recentActivity = [
      ...botAttendance.slice(0, 5).map(record => ({
        player_name: record.discord_users?.username || 'Unknown',
        status: record.status,
        date: new Date(record.created_at).toLocaleDateString(),
        source: 'Discord Bot'
      })),
      ...mainAttendance.slice(0, 5).map(record => ({
        player_name: record.users?.display_name || record.users?.name || 'Unknown',
        status: record.status,
        date: new Date(record.date).toLocaleDateString(),
        source: 'CRM Manual'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

    return NextResponse.json({
      success: true,
      team_info: {
        guild_id,
        team_id: discordServer?.connected_team_id,
        team_name: discordServer?.name || 'Unknown Team'
      },
      team_summary: {
        total_players: totalPlayers,
        total_sessions_recorded: totalSessions,
        team_attendance_rate: `${teamAttendanceRate}%`,
        total_present: totalPresent,
        total_late: totalLate,
        total_absent: totalAbsent,
        days_analyzed: days
      },
      most_consistent_player: consistentPlayer ? {
        name: consistentPlayer.player_name,
        attendance_rate: consistentPlayer.attendance_rate_formatted,
        total_sessions: consistentPlayer.total_sessions
      } : null,
      player_rankings: sortedPlayers.slice(0, 10),
      recent_activity: recentActivity,
      statistics: {
        bot_records: botAttendance.length,
        manual_records: mainAttendance.length,
        unique_players: totalPlayers
      },
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Team attendance summary error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}