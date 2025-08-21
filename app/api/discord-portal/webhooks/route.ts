import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateWebhookUrl } from '@/modules/discord-portal'
import type { DiscordWebhookInsert } from '@/modules/discord-portal'

// Initialize Supabase env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

function getUserClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  const userClient = getUserClient(request)
  if (!userClient) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await userClient
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userClient }
}

// GET - Fetch webhooks
export async function GET(request: NextRequest) {
  try {
    const { userData, userClient, error, status } = await getUserFromRequest(request)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    // Check permissions
    if (userData!.role === 'admin') {
      // Admin can view all webhooks or filter by team
      if (teamId) {
        const { data, error } = await userClient
          .from('discord_webhooks')
          .select(`*, teams:team_id(name)`)        
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ webhooks: data || [] })
      } else {
        const { data, error } = await userClient
          .from('discord_webhooks')
          .select(`*, teams:team_id(name)`)        
          .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ webhooks: data || [] })
      }
    } else if (userData!.role === 'manager') {
      // Managers can view webhooks
      if (userData!.team_id) {
        // Manager with team assignment - can only view their team's webhooks
        const requestedTeam = teamId || userData!.team_id
        if (requestedTeam !== userData!.team_id) {
          return NextResponse.json(
            { error: 'Cannot view webhooks for other teams' },
            { status: 403 }
          )
        }
        const { data, error } = await userClient
          .from('discord_webhooks')
          .select(`*, teams:team_id(name)`)        
          .eq('team_id', userData!.team_id)
          .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ webhooks: data || [] })
      } else {
        // Manager without team assignment - can view all webhooks like admin
        if (teamId) {
          const { data, error } = await userClient
            .from('discord_webhooks')
            .select(`*, teams:team_id(name)`)        
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
          if (error) throw error
          return NextResponse.json({ webhooks: data || [] })
        } else {
          const { data, error } = await userClient
            .from('discord_webhooks')
            .select(`*, teams:team_id(name)`)        
            .order('created_at', { ascending: false })
          if (error) throw error
          return NextResponse.json({ webhooks: data || [] })
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions to view webhooks' },
        { status: 403 }
      )
    }

  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create webhook
export async function POST(request: NextRequest) {
  try {
    const { userData, userClient, error, status } = await getUserFromRequest(request)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { hook_url, type, team_id, channel_name, active = true } = await request.json()

    // Check permissions
    const canManageWebhooks = userData!.role === 'admin' || 
      (userData!.role === 'manager' && team_id === userData!.team_id)
    
    if (!canManageWebhooks) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create webhooks' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!hook_url || !type) {
      return NextResponse.json(
        { error: 'hook_url and type are required' },
        { status: 400 }
      )
    }

    // Validate webhook type permissions
    if (type === 'admin' || type === 'global') {
      if (userData!.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can create admin/global webhooks' },
          { status: 403 }
        )
      }
    }

    // For team webhooks, ensure team_id is provided
    if (type === 'team' && !team_id) {
      return NextResponse.json(
        { error: 'team_id is required for team webhooks' },
        { status: 400 }
      )
    }

    const webhookData: DiscordWebhookInsert = {
      hook_url,
      type,
      team_id: type === 'team' ? team_id : null,
      channel_name,
      active,
      created_by: userData!.id
    }

    const { data, error: insertError } = await userClient
      .from('discord_webhooks')
      .insert(webhookData)
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, webhook: data })

  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update webhook
export async function PUT(request: NextRequest) {
  try {
    const { userData, userClient, error, status } = await getUserFromRequest(request)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      )
    }

    // Get the existing webhook to check permissions
    const { data: existingWebhook, error: fetchError } = await userClient
      .from('discord_webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canEdit = userData!.role === 'admin' || 
      (userData!.role === 'manager' && existingWebhook.team_id === userData!.team_id)
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this webhook' },
        { status: 403 }
      )
    }

    // If updating the URL, validate it first
    if (updates.hook_url) {
      const validation = await validateWebhookUrl(updates.hook_url)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    const { data, error: updateError } = await userClient
      .from('discord_webhooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, webhook: data })

  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const { userData, userClient, error, status } = await getUserFromRequest(request)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      )
    }

    // Get the existing webhook to check permissions
    const { data: existingWebhook, error: fetchError } = await userClient
      .from('discord_webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canDelete = userData!.role === 'admin' || 
      (userData!.role === 'manager' && existingWebhook.team_id === userData!.team_id)
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this webhook' },
        { status: 403 }
      )
    }

    const { error: delError } = await userClient
      .from('discord_webhooks')
      .delete()
      .eq('id', id)

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}