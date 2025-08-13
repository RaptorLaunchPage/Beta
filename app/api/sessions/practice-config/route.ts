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

// GET - Fetch practice session configurations
export async function GET(request: NextRequest) {
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

    // Check if practice_configs table exists, if not create dummy data
    let query = userSupabase!
      .from('practice_session_config')
      .select(`
        *,
        teams:team_id(name)
      `)

    // Apply role-based filtering
    if (userData!.role === 'coach' && userData!.team_id) {
      query = query.eq('team_id', userData!.team_id)
    } else if (!['admin', 'manager'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { data, error: queryError } = await query.order('session_subtype')

    if (queryError) {
      // If table doesn't exist, return default configurations
      if (queryError.code === '42P01') {
        const defaultConfigs = [
          {
            id: 'default-morning',
            team_id: null,
            session_subtype: 'Morning',
            start_time: '06:00',
            end_time: '10:00',
            cutoff_time: '12:00',
            is_active: true,
            created_by: userData!.id,
            teams: null
          },
          {
            id: 'default-evening',
            team_id: null,
            session_subtype: 'Evening',
            start_time: '16:00',
            end_time: '20:00',
            cutoff_time: '12:00',
            is_active: true,
            created_by: userData!.id,
            teams: null
          },
          {
            id: 'default-night',
            team_id: null,
            session_subtype: 'Night',
            start_time: '21:00',
            end_time: '23:59',
            cutoff_time: '12:00',
            is_active: true,
            created_by: userData!.id,
            teams: null
          }
        ]
        
        return NextResponse.json({
          configs: defaultConfigs
        })
      }

      console.error('Error fetching practice configs:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch configurations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      configs: data || []
    })

  } catch (error) {
    console.error('Error in practice configs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create practice session configuration
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

    // Only admins, managers, and coaches can create configurations
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can create configurations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      team_id, 
      session_subtype, 
      start_time, 
      end_time, 
      cutoff_time,
      is_active = true
    } = body

    if (!session_subtype || !start_time || !end_time || !cutoff_time) {
      return NextResponse.json(
        { error: 'Session subtype, start time, end time, and cutoff time are required' },
        { status: 400 }
      )
    }

    // Coaches can only create configurations for their own team
    if (userData!.role === 'coach' && team_id && userData!.team_id !== team_id) {
      return NextResponse.json(
        { error: 'Coaches can only create configurations for their own team' },
        { status: 403 }
      )
    }

    const { data, error: insertError } = await userSupabase!
      .from('practice_session_config')
      .insert({
        team_id,
        session_subtype,
        start_time,
        end_time,
        cutoff_time,
        is_active,
        created_by: userData!.id
      })
      .select()

    if (insertError) {
      console.error('Error creating practice config:', insertError)
      return NextResponse.json(
        { error: 'Failed to create configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Error in practice configs POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update practice session configuration
export async function PUT(request: NextRequest) {
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

    // Only admins, managers, and coaches can update configurations
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can update configurations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      id,
      team_id, 
      session_subtype, 
      start_time, 
      end_time, 
      cutoff_time,
      is_active
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      )
    }

    // Coaches can only update configurations for their own team
    if (userData!.role === 'coach' && team_id && userData!.team_id !== team_id) {
      return NextResponse.json(
        { error: 'Coaches can only update configurations for their own team' },
        { status: 403 }
      )
    }

    const { data, error: updateError } = await userSupabase!
      .from('practice_session_config')
      .update({
        team_id,
        session_subtype,
        start_time,
        end_time,
        cutoff_time,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('Error updating practice config:', updateError)
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0])

  } catch (error) {
    console.error('Error in practice configs PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete practice session configuration
export async function DELETE(request: NextRequest) {
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

    // Only admins, managers, and coaches can delete configurations
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Only administrators, managers, and coaches can delete configurations' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('id')

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      )
    }

    // For coaches, check if the configuration belongs to their team before deleting
    if (userData!.role === 'coach') {
      const { data: configData, error: configError } = await userSupabase!
        .from('practice_session_config')
        .select('team_id')
        .eq('id', configId)
        .single()

      if (configError || !configData) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      }

      if (configData.team_id !== userData!.team_id) {
        return NextResponse.json(
          { error: 'Coaches can only delete configurations for their own team' },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await userSupabase!
      .from('practice_session_config')
      .delete()
      .eq('id', configId)

    if (deleteError) {
      console.error('Error deleting practice config:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in practice configs DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}