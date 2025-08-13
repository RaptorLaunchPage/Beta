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
      tryout_id,
      discord_id,
      guild_id,
      // Player application fields
      full_name,
      ign,
      discord_tag,
      role_applied_for,
      game_id,
      availability = [],
      highlights_links = [],
      additional_notes,
      contact_email,
      contact_phone,
      // Team application fields (for team mode)
      team_name,
      manager_name,
      vod_link,
      // Source tracking
      application_source = 'discord_bot'
    } = body

    // Validate required fields
    if (!tryout_id || !discord_id || !guild_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: tryout_id, discord_id, guild_id' 
      }, { status: 400 })
    }

    // Get tryout details
    const { data: tryout, error: tryoutError } = await supabase
      .from('tryouts')
      .select('*')
      .eq('id', tryout_id)
      .single()

    if (tryoutError || !tryout) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 })
    }

    // Check if tryout is still active
    if (tryout.status !== 'active') {
      return NextResponse.json({ 
        error: 'Tryout is no longer accepting applications' 
      }, { status: 400 })
    }

    // Check application deadline
    if (tryout.application_deadline) {
      const deadline = new Date(tryout.application_deadline)
      if (new Date() > deadline) {
        return NextResponse.json({ 
          error: 'Application deadline has passed' 
        }, { status: 400 })
      }
    }

    // Check if user already applied to this tryout
    const { data: existingApplication } = await supabase
      .from('tryout_applications')
      .select('id, status')
      .eq('tryout_id', tryout_id)
      .eq('discord_id', discord_id)
      .single()

    if (existingApplication) {
      return NextResponse.json({ 
        success: true,
        application_id: existingApplication.id,
        current_status: existingApplication.status,
        message: 'You have already applied to this tryout',
        action: 'existing'
      })
    }

    // Validate mode-specific required fields
    if (tryout.mode === 'player') {
      if (!full_name || !ign) {
        return NextResponse.json({ 
          error: 'Missing required fields for player application: full_name, ign' 
        }, { status: 400 })
      }
    } else if (tryout.mode === 'team') {
      if (!team_name || !manager_name) {
        return NextResponse.json({ 
          error: 'Missing required fields for team application: team_name, manager_name' 
        }, { status: 400 })
      }
    }

    // Get client IP for tracking (if available)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    null

    // Create application
    const applicationData = {
      tryout_id,
      discord_id,
      full_name,
      ign,
      discord_tag,
      role_applied_for,
      game_id,
      availability,
      highlights_links,
      additional_notes,
      contact_email,
      contact_phone,
      team_name,
      manager_name,
      vod_link,
      application_source,
      status: 'applied',
      phase: 'applied',
      ip_address: clientIp,
      user_agent: request.headers.get('user-agent') || null
    }

    const { data: application, error: applicationError } = await supabase
      .from('tryout_applications')
      .insert(applicationData)
      .select()
      .single()

    if (applicationError) {
      console.error('Error creating application:', applicationError)
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }

    // Generate confirmation message based on mode
    const confirmationMessage = tryout.mode === 'team' 
      ? `Team "${team_name}" has been successfully registered for ${tryout.name}!`
      : `${full_name} (${ign}) has been successfully registered for ${tryout.name}!`

    // Generate embed for Discord confirmation
    const embedData = {
      title: '✅ Application Submitted Successfully!',
      description: confirmationMessage,
      fields: [
        {
          name: '🎯 Tryout',
          value: tryout.name,
          inline: true
        },
        {
          name: '📅 Applied',
          value: new Date().toLocaleDateString(),
          inline: true
        },
        {
          name: '🆔 Application ID',
          value: application.id.substring(0, 8),
          inline: true
        },
        ...(tryout.mode === 'team' ? [
          {
            name: '👥 Team Name',
            value: team_name,
            inline: true
          },
          {
            name: '👤 Manager',
            value: manager_name,
            inline: true
          }
        ] : [
          {
            name: '👤 Player Name',
            value: full_name,
            inline: true
          },
          {
            name: '🎮 IGN',
            value: ign,
            inline: true
          },
          ...(role_applied_for ? [{
            name: '🎭 Role',
            value: role_applied_for,
            inline: true
          }] : [])
        ]),
        {
          name: '📋 Status',
          value: 'Application Received - Under Review',
          inline: false
        }
      ],
      color: 0x00ff00,
      footer: {
        text: 'Raptors Esports Tryouts - You will be notified of updates'
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        tryout_id: application.tryout_id,
        status: application.status,
        phase: application.phase,
        discord_id: application.discord_id,
        created_at: application.created_at
      },
      tryout_info: {
        name: tryout.name,
        mode: tryout.mode,
        type: tryout.type
      },
      embed_data: embedData,
      message: 'Application submitted successfully',
      action: 'created'
    })

  } catch (error: any) {
    console.error('Tryout application error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}