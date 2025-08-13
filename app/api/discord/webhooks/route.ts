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
    const digest = searchParams.get('digest') === 'true'
    const type = searchParams.get('type') // 'team', 'admin', 'global'

    // Build query
    let query = supabase
      .from('discord_webhooks')
      .select(`
        id,
        hook_url,
        type,
        channel_name,
        active,
        created_at,
        teams(id, name)
      `)
      .eq('active', true)

    // Filter by guild if provided
    if (guild_id) {
      // Get team connected to guild
      const { data: discordServer } = await supabase
        .from('discord_servers')
        .select('connected_team_id')
        .eq('guild_id', guild_id)
        .single()

      if (discordServer?.connected_team_id) {
        query = query.eq('team_id', discordServer.connected_team_id)
      } else {
        // No team connected, return empty result
        return NextResponse.json({
          success: true,
          guild_id,
          webhooks: [],
          message: 'No team connected to this Discord server'
        })
      }
    }

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type)
    }

    // If digest=true, prioritize team webhooks for digest posting
    if (digest) {
      query = query.in('type', ['team', 'admin'])
    }

    const { data: webhooks, error } = await query.order('type', { ascending: true })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    // Process webhooks for response
    const processedWebhooks = webhooks.map((webhook: any) => ({
      id: webhook.id,
      url: webhook.hook_url,
      type: webhook.type,
      channel_name: webhook.channel_name,
      team_name: webhook.teams?.name,
      suitable_for_digest: ['team', 'admin'].includes(webhook.type),
      created_at: webhook.created_at
    }))

    // If digest=true, return the most suitable webhook
    if (digest && processedWebhooks.length > 0) {
      // Prioritize team webhooks over admin webhooks
      const bestWebhook = processedWebhooks.find(w => w.type === 'team') || 
                          processedWebhooks.find(w => w.type === 'admin') ||
                          processedWebhooks[0]

      return NextResponse.json({
        success: true,
        guild_id,
        recommended_webhook: bestWebhook,
        all_webhooks: processedWebhooks,
        message: `Found ${processedWebhooks.length} active webhook(s)`
      })
    }

    return NextResponse.json({
      success: true,
      guild_id,
      webhooks: processedWebhooks,
      count: processedWebhooks.length,
      types_available: [...new Set(processedWebhooks.map(w => w.type))],
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Webhooks fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// POST route to create/update webhook
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      guild_id,
      hook_url,
      type = 'team',
      channel_name,
      created_by_discord_id
    } = body

    if (!guild_id || !hook_url) {
      return NextResponse.json({ 
        error: 'Missing required fields: guild_id, hook_url' 
      }, { status: 400 })
    }

    // Get team connected to guild
    const { data: discordServer } = await supabase
      .from('discord_servers')
      .select('connected_team_id')
      .eq('guild_id', guild_id)
      .single()

    if (!discordServer?.connected_team_id) {
      return NextResponse.json({ 
        error: 'No team connected to this Discord server' 
      }, { status: 404 })
    }

    // Find Discord user for created_by if provided
    let createdBy = null
    if (created_by_discord_id) {
      const { data: discordUser } = await supabase
        .from('discord_users')
        .select('user_id')
        .eq('discord_id', created_by_discord_id)
        .eq('guild_id', guild_id)
        .single()
      
      createdBy = discordUser?.user_id
    }

    // Check if webhook already exists for this team and type
    const { data: existingWebhook } = await supabase
      .from('discord_webhooks')
      .select('id')
      .eq('team_id', discordServer.connected_team_id)
      .eq('type', type)
      .eq('hook_url', hook_url)
      .single()

    if (existingWebhook) {
      return NextResponse.json({ 
        success: true,
        webhook_id: existingWebhook.id,
        message: 'Webhook already exists',
        action: 'none'
      })
    }

    // Create new webhook
    const { data: newWebhook, error } = await supabase
      .from('discord_webhooks')
      .insert({
        team_id: discordServer.connected_team_id,
        hook_url,
        type,
        channel_name,
        active: true,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: newWebhook.id,
        url: newWebhook.hook_url,
        type: newWebhook.type,
        channel_name: newWebhook.channel_name,
        team_id: newWebhook.team_id
      },
      message: 'Webhook created successfully',
      action: 'created'
    })

  } catch (error: any) {
    console.error('Webhook creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}