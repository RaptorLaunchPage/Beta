import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  getTeamAutomationSettings,
  getGlobalAutomationSettings,
  updateAutomationSetting
} from '@/modules/discord-portal'
import type { AutomationKey } from '@/modules/discord-portal'

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

// GET - Fetch automation settings
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

    let settings
    if (isGlobal) {
      settings = await getGlobalAutomationSettings()
    } else {
      const targetTeamId = teamId || userData!.team_id
      if (!targetTeamId) {
        return NextResponse.json(
          { error: 'No team specified' },
          { status: 400 }
        )
      }
      settings = await getTeamAutomationSettings(targetTeamId)
    }

    return NextResponse.json({ settings })

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

    const result = await updateAutomationSetting(
      settingKey,
      enabled,
      finalTeamId,
      userData!.id
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error updating automation setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}