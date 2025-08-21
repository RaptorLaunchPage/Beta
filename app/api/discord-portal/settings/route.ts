import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { AutomationKey } from '@/modules/discord-portal'

// Initialize Supabase client factory for user-bound operations
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
  return createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
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

  return { userData }
}

// GET - Fetch automation settings
export async function GET(request: NextRequest) {
  try {
    const userClient = getUserClient(request)
    if (!userClient) {
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
    const isGlobal = searchParams.get('global') === 'true'

    // Check permissions
    if (isGlobal && userData!.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view global settings' },
        { status: 403 }
      )
    }

    if (teamId && userData!.role !== 'admin' && teamId !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Cannot view settings for other teams' },
        { status: 403 }
      )
    }

    // Query settings with user-bound client and return array shape for UI
    const query = userClient
      .from('communication_settings')
      .select('setting_key, setting_value, team_id')

    if (isGlobal) {
      query.is('team_id', null)
    } else {
      const targetTeamId = teamId || userData!.team_id
      if (!targetTeamId) {
        return NextResponse.json(
          { error: 'No team specified' },
          { status: 400 }
        )
      }
      query.eq('team_id', targetTeamId)
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ settings: data || [] })

  } catch (error) {
    console.error('Error fetching automation settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update automation setting
export async function PUT(request: NextRequest) {
  try {
    const userClient = getUserClient(request)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { settingKey, enabled, teamId, isGlobal = false } = await request.json()

    if (!settingKey || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'settingKey and enabled are required' },
        { status: 400 }
      )
    }

    // Validate automation key
    const validKeys: AutomationKey[] = [
      'auto_slot_create',
      'auto_roster_update',
      'auto_daily_summary',
      'auto_weekly_digest',
      'auto_performance_alerts',
      'auto_attendance_alerts',
      'auto_data_cleanup',
      'auto_system_alerts',
      'auto_admin_notifications'
    ]

    if (!validKeys.includes(settingKey)) {
      return NextResponse.json(
        { error: 'Invalid setting key' },
        { status: 400 }
      )
    }

    // Check permissions
    if (isGlobal && userData!.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can modify global settings' },
        { status: 403 }
      )
    }

    // Global admin settings
    const globalSettings = ['auto_data_cleanup', 'auto_system_alerts', 'auto_admin_notifications']
    if (globalSettings.includes(settingKey) && userData!.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can modify this setting' },
        { status: 403 }
      )
    }

    let finalTeamId = null
    if (!isGlobal) {
      finalTeamId = teamId || userData!.team_id
      
      // Check team permission
      if (userData!.role !== 'admin' && finalTeamId !== userData!.team_id) {
        return NextResponse.json(
          { error: 'Cannot modify settings for other teams' },
          { status: 403 }
        )
      }

      if (!finalTeamId) {
        return NextResponse.json(
          { error: 'No team specified for team setting' },
          { status: 400 }
        )
      }
    }

    const { error: upsertError } = await userClient
      .from('communication_settings')
      .upsert({
        team_id: finalTeamId,
        setting_key: settingKey,
        setting_value: enabled,
        updated_by: userData!.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'team_id,setting_key' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating automation setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}