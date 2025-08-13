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
    const discord_id = searchParams.get('discord_id')
    const guild_id = searchParams.get('guild_id')
    const days = parseInt(searchParams.get('days') || '30')

    if (!discord_id || !guild_id) {
      return NextResponse.json({ 
        error: 'Missing required parameters: discord_id, guild_id' 
      }, { status: 400 })
    }

    // Find Discord user
    const { data: discordUser, error: discordError } = await supabase
      .from('discord_users')
      .select('user_id, username')
      .eq('discord_id', discord_id)
      .eq('guild_id', guild_id)
      .single()

    if (discordError && discordError.code !== 'PGRST116') {
      console.error('Error finding Discord user:', discordError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    const dateTo = new Date()

    // Get bot attendance records
    const { data: botAttendance, error: botError } = await supabase
      .from('bot_attendance')
      .select('*')
      .eq('discord_id', discord_id)
      .eq('guild_id', guild_id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })

    if (botError) {
      console.error('Error fetching bot attendance:', botError)
      return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 })
    }

    // Get main attendance records if user is linked
    let mainAttendance: any[] = []
    if (discordUser?.user_id && discordServer?.connected_team_id) {
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendances')
        .select(`
          *,
          sessions(id, session_type, session_subtype, title)
        `)
        .eq('player_id', discordUser.user_id)
        .eq('team_id', discordServer.connected_team_id)
        .gte('date', dateFrom.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (!attendanceError) {
        mainAttendance = attendance || []
      }
    }

    // Calculate statistics
    const totalBotRecords = botAttendance.length
    const presentCount = [...botAttendance, ...mainAttendance].filter(
      record => record.status === 'present'
    ).length
    const lateCount = [...botAttendance, ...mainAttendance].filter(
      record => record.status === 'late'
    ).length
    const absentCount = [...botAttendance, ...mainAttendance].filter(
      record => record.status === 'absent'
    ).length

    // Calculate attendance rate
    const totalSessions = presentCount + lateCount + absentCount
    const attendanceRate = totalSessions > 0 
      ? ((presentCount + lateCount) / totalSessions * 100).toFixed(1)
      : '0.0'

    // Recent attendance records
    const recentRecords = [
      ...botAttendance.map(record => ({
        ...record,
        source: 'bot',
        formatted_date: new Date(record.created_at).toLocaleDateString()
      })),
      ...mainAttendance.map(record => ({
        ...record,
        source: 'manual',
        formatted_date: new Date(record.date).toLocaleDateString(),
        session_info: record.sessions
      }))
    ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
    .slice(0, 10)

    // Calculate streak (consecutive days present/late)
    let currentStreak = 0
    const sortedRecords = recentRecords.slice().reverse()
    for (const record of sortedRecords) {
      if (record.status === 'present' || record.status === 'late') {
        currentStreak++
      } else {
        break
      }
    }

    return NextResponse.json({
      success: true,
      user_info: {
        discord_id,
        username: discordUser?.username || 'Unknown User',
        user_linked: !!discordUser?.user_id,
        guild_id
      },
      team_info: {
        team_id: discordServer?.connected_team_id,
        team_name: discordServer?.name || 'Unknown Team'
      },
      summary: {
        total_sessions: totalSessions,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        attendance_rate: `${attendanceRate}%`,
        current_streak: currentStreak,
        days_analyzed: days
      },
      recent_records: recentRecords,
      statistics: {
        most_common_status: presentCount >= lateCount && presentCount >= absentCount ? 'present' :
                           lateCount >= absentCount ? 'late' : 'absent',
        bot_records: totalBotRecords,
        manual_records: mainAttendance.length
      },
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Attendance summary error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}