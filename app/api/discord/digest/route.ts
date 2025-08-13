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
    const type = searchParams.get('type') || 'daily' // 'daily' or 'weekly'

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

    // Calculate date range based on type
    const now = new Date()
    const dateFrom = new Date()
    
    if (type === 'weekly') {
      dateFrom.setDate(dateFrom.getDate() - 7)
    } else {
      dateFrom.setDate(dateFrom.getDate() - 1)
    }

    // Parallel data fetching for performance
    const [
      performanceResult,
      attendanceResult,
      sessionsResult,
      financialsResult
    ] = await Promise.allSettled([
      // Performance data
      supabase
        .from('performance_records')
        .select(`
          *,
          discord_users(username)
        `)
        .eq('guild_id', guild_id)
        .gte('created_at', dateFrom.toISOString()),

      // Attendance data (bot)
      supabase
        .from('bot_attendance')
        .select(`
          *,
          discord_users(username)
        `)
        .eq('guild_id', guild_id)
        .gte('created_at', dateFrom.toISOString()),

      // Sessions data
      discordServer?.connected_team_id ? supabase
        .from('sessions')
        .select('*')
        .eq('team_id', discordServer.connected_team_id)
        .gte('date', dateFrom.toISOString().split('T')[0]) : null,

      // Financial data (slots, winnings, expenses)
      discordServer?.connected_team_id ? supabase
        .from('slots')
        .select(`
          *,
          winnings(*),
          slot_expenses(*)
        `)
        .eq('team_id', discordServer.connected_team_id)
        .gte('date', dateFrom.toISOString().split('T')[0]) : null
    ])

    // Extract data from results
    const performanceData = performanceResult.status === 'fulfilled' ? performanceResult.value.data || [] : []
    const attendanceData = attendanceResult.status === 'fulfilled' ? attendanceResult.value.data || [] : []
    const sessionsData = sessionsResult.status === 'fulfilled' && sessionsResult.value ? sessionsResult.value.data || [] : []
    const financialsData = financialsResult.status === 'fulfilled' && financialsResult.value ? financialsResult.value.data || [] : []

    // Performance Summary
    const performanceSummary = {
      total_matches: performanceData.length,
      total_kills: performanceData.reduce((sum, p) => sum + (p.kills || 0), 0),
      total_damage: performanceData.reduce((sum, p) => sum + (p.damage || 0), 0),
      avg_placement: performanceData.length > 0 
        ? (performanceData.reduce((sum, p) => sum + (p.placement || 100), 0) / performanceData.length).toFixed(1)
        : '0.0',
      best_placement: performanceData.length > 0 
        ? Math.min(...performanceData.map(p => p.placement || 100))
        : null,
      top_performer: null as any
    }

    // Find top performer
    const playerPerformance: { [key: string]: any } = {}
    performanceData.forEach(record => {
      const playerId = record.discord_id
      if (!playerPerformance[playerId]) {
        playerPerformance[playerId] = {
          username: record.discord_users?.username || 'Unknown',
          matches: 0,
          kills: 0,
          damage: 0,
          best_placement: 100
        }
      }
      playerPerformance[playerId].matches++
      playerPerformance[playerId].kills += record.kills || 0
      playerPerformance[playerId].damage += record.damage || 0
      playerPerformance[playerId].best_placement = Math.min(
        playerPerformance[playerId].best_placement, 
        record.placement || 100
      )
    })

    const topPerformer = Object.values(playerPerformance)
      .filter((p: any) => p.matches > 0)
      .sort((a: any, b: any) => b.kills - a.kills)[0]

    performanceSummary.top_performer = topPerformer

    // Attendance Summary
    const attendanceSummary = {
      total_records: attendanceData.length,
      present: attendanceData.filter(a => a.status === 'present').length,
      late: attendanceData.filter(a => a.status === 'late').length,
      absent: attendanceData.filter(a => a.status === 'absent').length,
      unique_players: new Set(attendanceData.map(a => a.discord_id)).size,
      attendance_rate: '0.0%'
    }

    if (attendanceSummary.total_records > 0) {
      const rate = ((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total_records * 100).toFixed(1)
      attendanceSummary.attendance_rate = `${rate}%`
    }

    // Sessions Summary
    const sessionsSummary = {
      total_sessions: sessionsData.length,
      practice_sessions: sessionsData.filter(s => s.session_type === 'practice').length,
      tournament_sessions: sessionsData.filter(s => s.session_type === 'tournament').length,
      meeting_sessions: sessionsData.filter(s => s.session_type === 'meeting').length,
      upcoming_sessions: sessionsData.filter(s => new Date(s.date) > now).length
    }

    // Financial Summary
    const financialSummary = {
      total_slots: financialsData.length,
      total_expenses: 0,
      total_winnings: 0,
      net_result: 0,
      slots_breakdown: [] as any[]
    }

    financialsData.forEach(slot => {
      const expenses = slot.slot_expenses?.reduce((sum: number, exp: any) => sum + (exp.total || 0), 0) || 0
      const winnings = slot.winnings?.reduce((sum: number, win: any) => sum + (win.amount_won || 0), 0) || 0
      
      financialSummary.total_expenses += expenses
      financialSummary.total_winnings += winnings
      
      financialSummary.slots_breakdown.push({
        organizer: slot.organizer,
        date: slot.date,
        expenses,
        winnings,
        net: winnings - expenses
      })
    })

    financialSummary.net_result = financialSummary.total_winnings - financialSummary.total_expenses

    // Activity highlights
    const highlights = []
    
    if (performanceSummary.total_matches > 0) {
      highlights.push(`🎮 **${performanceSummary.total_matches}** matches played`)
    }
    
    if (performanceSummary.top_performer) {
      highlights.push(`🏆 Top performer: **${performanceSummary.top_performer.username}** (${performanceSummary.top_performer.kills} kills)`)
    }
    
    if (attendanceSummary.attendance_rate !== '0.0%') {
      highlights.push(`📊 Team attendance: **${attendanceSummary.attendance_rate}**`)
    }
    
    if (financialSummary.net_result > 0) {
      highlights.push(`💰 Net profit: **₹${financialSummary.net_result}**`)
    } else if (financialSummary.net_result < 0) {
      highlights.push(`📉 Net loss: **₹${Math.abs(financialSummary.net_result)}**`)
    }

    return NextResponse.json({
      success: true,
      digest_type: type,
      period: {
        from: dateFrom.toISOString(),
        to: now.toISOString(),
        days: type === 'weekly' ? 7 : 1
      },
      team_info: {
        guild_id,
        team_id: discordServer?.connected_team_id,
        team_name: discordServer?.name || 'Unknown Team'
      },
      summary: {
        performance: performanceSummary,
        attendance: attendanceSummary,
        sessions: sessionsSummary,
        financials: financialSummary,
        highlights
      },
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Digest generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}