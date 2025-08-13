import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await userSupabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userSupabase }
}

// POST - Reset practice session configurations to defaults
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only admins and managers can reset configurations
    if (!['admin', 'manager'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators and managers can reset configurations' },
        { status: 403 }
      )
    }

    // Default session timings
    const defaultConfigs = [
      {
        session_subtype: 'Morning',
        start_time: '06:00',
        end_time: '10:00',
        cutoff_time: '12:00',
        is_active: true,
        created_by: userData!.id
      },
      {
        session_subtype: 'Evening',
        start_time: '16:00',
        end_time: '20:00',
        cutoff_time: '12:00',
        is_active: true,
        created_by: userData!.id
      },
      {
        session_subtype: 'Night',
        start_time: '21:00',
        end_time: '23:59',
        cutoff_time: '12:00',
        is_active: true,
        created_by: userData!.id
      }
    ]

    // Delete existing global configurations (team_id is null)
    const { error: deleteError } = await userSupabase!
      .from('practice_session_config')
      .delete()
      .is('team_id', null)

    if (deleteError) {
      console.error('Error deleting existing configs:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset configurations' },
        { status: 500 }
      )
    }

    // Insert default configurations
    const { data, error: insertError } = await userSupabase!
      .from('practice_session_config')
      .insert(defaultConfigs)
      .select()

    if (insertError) {
      console.error('Error inserting default configs:', insertError)
      return NextResponse.json(
        { error: 'Failed to create default configurations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configurations reset to defaults',
      configs: data
    })

  } catch (error) {
    console.error('Error in practice configs reset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}