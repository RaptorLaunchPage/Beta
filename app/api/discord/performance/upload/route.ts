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
      kills,
      damage,
      placement,
      survival_time,
      assists,
      map_name,
      game_mode,
      match_id,
      metadata
    } = body

    // Validate required fields
    if (!discord_id || !guild_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: discord_id, guild_id' 
      }, { status: 400 })
    }

    // Find user by Discord ID
    const { data: discordUser, error: discordError } = await supabase
      .from('discord_users')
      .select('user_id, guild_id')
      .eq('discord_id', discord_id)
      .eq('guild_id', guild_id)
      .single()

    if (discordError && discordError.code !== 'PGRST116') {
      console.error('Error finding Discord user:', discordError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Get team_id from guild
    const { data: discordServer, error: serverError } = await supabase
      .from('discord_servers')
      .select('connected_team_id')
      .eq('guild_id', guild_id)
      .single()

    if (serverError && serverError.code !== 'PGRST116') {
      console.error('Error finding Discord server:', serverError)
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Convert survival_time to PostgreSQL interval format if provided
    let survivalInterval = null
    if (survival_time) {
      // Assuming survival_time is in seconds
      const minutes = Math.floor(survival_time / 60)
      const seconds = survival_time % 60
      survivalInterval = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Insert performance record
    const { data, error } = await supabase
      .from('performance_records')
      .insert({
        discord_id,
        guild_id,
        team_id: discordServer?.connected_team_id,
        user_id: discordUser?.user_id,
        match_id,
        kills: kills || 0,
        damage: damage || 0,
        placement,
        survival_time: survivalInterval,
        assists: assists || 0,
        map_name,
        game_mode,
        source: 'bot',
        metadata: metadata || {},
        processed: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting performance record:', error)
      return NextResponse.json({ error: 'Failed to save performance data' }, { status: 500 })
    }

    // Optionally sync to main performances table if user is linked
    if (discordUser?.user_id && discordServer?.connected_team_id) {
      try {
        await supabase
          .from('performances')
          .insert({
            team_id: discordServer.connected_team_id,
            player_id: discordUser.user_id,
            match_number: parseInt(match_id?.replace(/\D/g, '') || '1'),
            map: map_name || 'Unknown',
            placement,
            kills: kills || 0,
            assists: assists || 0,
            damage: damage || 0,
            survival_time: parseFloat(survival_time?.toString() || '0'),
            slot: match_id,
            added_by: discordUser.user_id
          })
      } catch (syncError) {
        console.warn('Failed to sync to main performances table:', syncError)
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      record_id: data.id,
      message: 'Performance data saved successfully' 
    })

  } catch (error: any) {
    console.error('Performance upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}