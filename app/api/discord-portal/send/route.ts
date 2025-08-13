import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToDiscord } from '@/modules/discord-portal'
import type { MessageType } from '@/modules/discord-portal'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const {
      messageType,
      data,
      teamId,
      webhookTypes = ['team'],
      webhookId
    } = await request.json()

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, team_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions (basic check - detailed permissions handled in sendToDiscord)
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst']
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate messageType
    const validMessageTypes: MessageType[] = [
      'slot_create', 'roster_update', 'performance_summary', 
      'attendance_summary', 'expense_summary', 'winnings_summary',
      'daily_summary', 'weekly_digest', 'analytics_trend', 'system_alert'
    ]
    
    if (!validMessageTypes.includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      )
    }

    // For non-admin users, restrict to their team
    let finalTeamId = teamId
    if (userData.role !== 'admin' && teamId && teamId !== userData.team_id) {
      return NextResponse.json(
        { error: 'Cannot send messages for other teams' },
        { status: 403 }
      )
    }

    // If no teamId provided, use user's team (except for admin global messages)
    if (!finalTeamId && userData.team_id) {
      finalTeamId = userData.team_id
    }

    // Send the message
    const result = await sendToDiscord({
      messageType,
      data,
      teamId: finalTeamId,
      triggeredBy: userData.id,
      isAutomatic: false,
      webhookTypes,
      webhookId
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        logId: result.log_id
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in communication send API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method for message preview (without actually sending)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageType = searchParams.get('messageType') as MessageType
    const dataStr = searchParams.get('data')
    const webhookId = searchParams.get('webhookId')

    if (!messageType || !dataStr) {
      return NextResponse.json(
        { error: 'messageType and data parameters required' },
        { status: 400 }
      )
    }

    // Validate webhook if provided
    if (webhookId) {
      if (!supabase) {
        return NextResponse.json(
          { error: 'Service unavailable' },
          { status: 503 }
        )
      }

      // Verify user has access to this webhook
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization header required' },
          { status: 401 }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }

      // Check if webhook exists and user has access
      const { getWebhookById } = await import('@/modules/discord-portal')
      const webhook = await getWebhookById(webhookId)
      if (!webhook) {
        return NextResponse.json(
          { error: 'Webhook not found or inactive' },
          { status: 404 }
        )
      }
    }

    const data = JSON.parse(dataStr)

    // Import embed formatter dynamically to avoid server-side issues
    const { formatEmbed } = await import('@/modules/discord-portal')
    
    // Generate preview embed
    const embed = formatEmbed(messageType, data)

    return NextResponse.json({
      success: true,
      preview: {
        embeds: [embed],
        username: 'Raptor Esports CRM',
        avatar_url: process.env.NEXT_PUBLIC_RAPTOR_LOGO_URL || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=64&h=64&fit=crop&crop=center'
      }
    })

  } catch (error) {
    console.error('Error generating message preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}