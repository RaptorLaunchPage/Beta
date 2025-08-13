import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  getAllWebhooks, 
  getTeamWebhooks, 
  createWebhook, 
  updateWebhook, 
  deleteWebhook,
  validateWebhookUrl
} from '@/modules/discord-portal'
import type { DiscordWebhookInsert } from '@/modules/discord-portal'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  if (!supabase) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData }
}

// GET - Fetch webhooks
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    // Check permissions
    if (userData!.role === 'admin') {
      // Admin can view all webhooks or filter by team
      if (teamId) {
        const webhooks = await getTeamWebhooks(teamId)
        return NextResponse.json({ webhooks })
      } else {
        const webhooks = await getAllWebhooks()
        return NextResponse.json({ webhooks })
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
        const webhooks = await getTeamWebhooks(userData!.team_id)
        return NextResponse.json({ webhooks })
      } else {
        // Manager without team assignment - can view all webhooks like admin
        if (teamId) {
          const webhooks = await getTeamWebhooks(teamId)
          return NextResponse.json({ webhooks })
        } else {
          const webhooks = await getAllWebhooks()
          return NextResponse.json({ webhooks })
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
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
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

    const result = await createWebhook(webhookData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        webhook: result.webhook
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

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
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
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
    const { data: existingWebhook, error: fetchError } = await supabase
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

    const result = await updateWebhook(id, updates)

    if (result.success) {
      return NextResponse.json({
        success: true,
        webhook: result.webhook
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

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
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
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
    const { data: existingWebhook, error: fetchError } = await supabase
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

    const result = await deleteWebhook(id)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}