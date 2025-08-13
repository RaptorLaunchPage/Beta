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
    const type = searchParams.get('type') || 'current' // 'current', 'next', 'today', 'week'

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

    if (!discordServer.connected_team_id) {
      return NextResponse.json({ 
        error: 'No team connected to this Discord server' 
      }, { status: 404 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM format

    let query = supabase
      .from('sessions')
      .select(`
        id,
        session_type,
        session_subtype,
        date,
        start_time,
        end_time,
        title,
        description,
        is_mandatory,
        created_by,
        created_at
      `)
      .eq('team_id', discordServer.connected_team_id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply date and time filters based on type
    switch (type) {
      case 'current':
        // Find sessions happening right now
        query = query
          .eq('date', today)
          .lte('start_time', currentTime)
          .gte('end_time', currentTime)
        break
      
      case 'next':
        // Find next upcoming session
        query = query
          .or(`date.gt.${today},and(date.eq.${today},start_time.gt.${currentTime})`)
          .limit(1)
        break
      
      case 'today':
        // All sessions today
        query = query.eq('date', today)
        break
      
      case 'week':
        // Sessions in the next 7 days
        const weekAhead = new Date()
        weekAhead.setDate(weekAhead.getDate() + 7)
        const weekAheadDate = weekAhead.toISOString().split('T')[0]
        
        query = query
          .gte('date', today)
          .lte('date', weekAheadDate)
        break
      
      default:
        // Default to upcoming sessions
        query = query.gte('date', today)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Enhance sessions with additional info
    const enhancedSessions = sessions.map(session => {
      const sessionDate = new Date(`${session.date}T${session.start_time}`)
      const isToday = session.date === today
      const isPast = sessionDate < now
      const isCurrent = isToday && 
        session.start_time <= currentTime && 
        session.end_time >= currentTime

      return {
        ...session,
        is_today: isToday,
        is_current: isCurrent,
        is_past: isPast,
        time_until: isPast ? null : Math.round((sessionDate.getTime() - now.getTime()) / 60000), // minutes
        formatted_time: `${session.start_time} - ${session.end_time}`,
        formatted_date: new Date(session.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    })

    return NextResponse.json({
      success: true,
      guild_id,
      team_info: {
        team_id: discordServer.connected_team_id,
        team_name: discordServer.name || 'Unknown Team'
      },
      query_type: type,
      sessions: enhancedSessions,
      current_time: now.toISOString(),
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}