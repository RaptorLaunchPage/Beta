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
      guild_id,
      discord_channel_id,
      name,
      purpose = 'new_team',
      mode = 'player',
      type = 'scrim',
      target_roles = [],
      team_ids = [],
      description,
      requirements,
      application_deadline,
      evaluation_method = 'manual',
      additional_links = [],
      created_by_discord_id,
      open_to_public = true
    } = body

    // Validate required fields
    if (!guild_id || !name || !created_by_discord_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: guild_id, name, created_by_discord_id' 
      }, { status: 400 })
    }

    // Find Discord user who created the tryout
    const { data: discordUser, error: discordUserError } = await supabase
      .from('discord_users')
      .select('user_id')
      .eq('discord_id', created_by_discord_id)
      .eq('guild_id', guild_id)
      .single()

    if (discordUserError && discordUserError.code !== 'PGRST116') {
      console.error('Error finding Discord user:', discordUserError)
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Parse application deadline if provided
    let deadlineDate = null
    if (application_deadline) {
      deadlineDate = new Date(application_deadline).toISOString()
    }

    // Create tryout record
    const { data: tryout, error: tryoutError } = await supabase
      .from('tryouts')
      .insert({
        name,
        purpose,
        mode,
        type,
        target_roles,
        team_ids,
        description,
        requirements,
        application_deadline: deadlineDate,
        evaluation_method,
        additional_links,
        guild_id,
        discord_channel_id,
        open_to_public,
        status: 'active',
        created_by: discordUser?.user_id,
        launched_at: new Date().toISOString()
      })
      .select()
      .single()

    if (tryoutError) {
      console.error('Error creating tryout:', tryoutError)
      return NextResponse.json({ error: 'Failed to create tryout' }, { status: 500 })
    }

    // Generate tryout link for applications
    const applicationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/tryout/${tryout.id}/apply`

    return NextResponse.json({
      success: true,
      tryout: {
        id: tryout.id,
        name: tryout.name,
        purpose: tryout.purpose,
        mode: tryout.mode,
        type: tryout.type,
        status: tryout.status,
        guild_id: tryout.guild_id,
        discord_channel_id: tryout.discord_channel_id,
        application_deadline: tryout.application_deadline,
        open_to_public: tryout.open_to_public,
        created_at: tryout.created_at
      },
      application_url: applicationUrl,
      embed_data: {
        title: `🎯 ${tryout.name}`,
        description: tryout.description || 'New tryout opportunity available!',
        fields: [
          {
            name: '🎮 Type',
            value: tryout.type,
            inline: true
          },
          {
            name: '👥 Mode',
            value: tryout.mode,
            inline: true
          },
          {
            name: '🎯 Purpose',
            value: tryout.purpose,
            inline: true
          },
          ...(tryout.target_roles && tryout.target_roles.length > 0 ? [{
            name: '🎭 Target Roles',
            value: tryout.target_roles.join(', '),
            inline: false
          }] : []),
          ...(tryout.application_deadline ? [{
            name: '⏰ Application Deadline',
            value: new Date(tryout.application_deadline).toLocaleDateString(),
            inline: false
          }] : []),
          {
            name: '📝 How to Apply',
            value: `[Click here to apply](${applicationUrl})`,
            inline: false
          }
        ],
        color: 0x00ff00,
        footer: {
          text: 'Raptors Esports Tryouts'
        },
        timestamp: new Date().toISOString()
      },
      message: 'Tryout announced successfully'
    })

  } catch (error: any) {
    console.error('Tryout announcement error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}