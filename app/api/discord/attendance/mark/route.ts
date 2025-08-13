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

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      discord_id,
      guild_id,
      session_id,
      attendance_type,
      status,
      duration,
      metadata
    } = body

    // Validate required fields
    if (!discord_id || !guild_id || !attendance_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: discord_id, guild_id, attendance_type' 
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
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Get current or next session if session_id not provided
    let targetSessionId = session_id
    if (!targetSessionId) {
      // Find current or upcoming session for the team
      const { data: discordServer } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guild_id)
        .single()

      if (discordServer?.connected_team_id) {
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        
        const { data: currentSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('team_id', discordServer.connected_team_id)
          .eq('date', today)
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        targetSessionId = currentSession?.id
      }
    }

    // Convert duration to PostgreSQL interval format if provided
    let durationInterval = null
    if (duration) {
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      durationInterval = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Insert bot attendance record
    const { data: botAttendance, error: botError } = await supabase
      .from('bot_attendance')
      .insert({
        discord_id,
        guild_id,
        user_id: discordUser?.user_id,
        session_id: targetSessionId,
        attendance_type,
        status: status || 'present',
        duration: durationInterval,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (botError) {
      console.error('Error inserting bot attendance:', botError)
      return NextResponse.json({ error: 'Failed to save attendance data' }, { status: 500 })
    }

    // Also update main attendances table if user is linked and session exists
    if (discordUser?.user_id && targetSessionId) {
      try {
        // Get session details
        const { data: sessionDetails } = await supabase
          .from('sessions')
          .select('team_id, date, start_time, end_time')
          .eq('id', targetSessionId)
          .single()

        if (sessionDetails) {
          // Check if attendance record already exists
          const { data: existingAttendance } = await supabase
            .from('attendances')
            .select('id')
            .eq('player_id', discordUser.user_id)
            .eq('session_id', targetSessionId)
            .single()

          const attendanceData = {
            player_id: discordUser.user_id,
            team_id: sessionDetails.team_id,
            date: sessionDetails.date,
            session_time: `${sessionDetails.start_time} - ${sessionDetails.end_time}`,
            status: status || 'present',
            marked_by: discordUser.user_id,
            session_id: targetSessionId,
            source: 'auto'
          }

          if (existingAttendance) {
            // Update existing record
            await supabase
              .from('attendances')
              .update({
                status: status || 'present',
                source: 'auto'
              })
              .eq('id', existingAttendance.id)
          } else {
            // Insert new record
            await supabase
              .from('attendances')
              .insert(attendanceData)
          }
        }
      } catch (syncError) {
        console.warn('Failed to sync to main attendance table:', syncError)
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      attendance_id: botAttendance.id,
      session_id: targetSessionId,
      user_linked: !!discordUser?.user_id,
      message: 'Attendance marked successfully' 
    })

  } catch (error: any) {
    console.error('Attendance marking error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}