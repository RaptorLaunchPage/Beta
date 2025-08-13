import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDiscordLogs, retryFailedMessage } from '@/modules/discord-portal'
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

// GET - Fetch communication logs
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

    // Check permissions
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst']
    if (!allowedRoles.includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view logs' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const messageType = searchParams.get('messageType') as MessageType
    const logStatus = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // For non-admin users, restrict to their team
    let finalTeamId = teamId
    if (userData!.role !== 'admin') {
      if (teamId && teamId !== userData!.team_id) {
        return NextResponse.json(
          { error: 'Cannot view logs for other teams' },
          { status: 403 }
        )
      }
      finalTeamId = userData!.team_id
    }

    const result = await getDiscordLogs({
      teamId: finalTeamId || undefined,
      messageType,
      status: logStatus || undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      logs: result.logs,
      pagination: {
        limit,
        offset,
        hasMore: result.logs.length === limit
      }
    })

  } catch (error) {
    console.error('Error fetching communication logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Retry failed message
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

    // Check permissions
    const allowedRoles = ['admin', 'manager']
    if (!allowedRoles.includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to retry messages' },
        { status: 403 }
      )
    }

    const { logId } = await request.json()

    if (!logId) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      )
    }

    // Get the log entry to check permissions
    const { data: logEntry, error: logError } = await supabase
      .from('communication_logs')
      .select('team_id')
      .eq('id', logId)
      .single()

    if (logError || !logEntry) {
      return NextResponse.json(
        { error: 'Log entry not found' },
        { status: 404 }
      )
    }

    // For non-admin users, check team access
    if (userData!.role !== 'admin' && logEntry.team_id !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Cannot retry messages for other teams' },
        { status: 403 }
      )
    }

    const result = await retryFailedMessage(logId)

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
    console.error('Error retrying failed message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}