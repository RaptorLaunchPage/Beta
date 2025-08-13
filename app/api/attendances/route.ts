import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Authorization header required', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token', status: 401 }
  const { data: userData, error: userError } = await userSupabase
    .from('users').select('id, role, team_id').eq('id', user.id).single()
  if (userError || !userData) return { error: 'User not found', status: 404 }
  return { userData, userSupabase }
}

// GET list attendances with optional timeframe and team filter
export async function GET(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const teamId = searchParams.get('teamId')

    const end = new Date()
    const start = new Date(); start.setDate(start.getDate() - timeframe)

    let query = userSupabase
      .from('attendances')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Role-based filtering
    if (['admin', 'manager'].includes(userData.role)) {
      // allow optional team filter
      if (teamId) query = query.eq('team_id', teamId)
    } else if (['coach', 'analyst'].includes(userData.role)) {
      if (userData.team_id) query = query.eq('team_id', userData.team_id)
      else return NextResponse.json([])
    } else if (userData.role === 'player') {
      query = query.eq('player_id', userData.id)
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error: qErr } = await query.order('created_at', { ascending: false })
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e: any) {
    console.error('Attendances GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create attendance
export async function POST(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const body = await request.json()
    const { player_id, team_id, date, session_time, status: attStatus, slot_id, session_id, source } = body

    // Permissions: players can create for themselves only; coach limited to their team; manager/admin unrestricted
    if (userData.role === 'player') {
      if (player_id !== userData.id) return NextResponse.json({ error: 'Players can only mark their own attendance' }, { status: 403 })
    } else if (userData.role === 'coach') {
      if (!userData.team_id || userData.team_id !== team_id) return NextResponse.json({ error: 'Coaches can only mark for their own team' }, { status: 403 })
    } else if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error: insErr } = await userSupabase
      .from('attendances')
      .insert({ player_id, team_id, date, session_time, status: attStatus, slot_id: slot_id || null, session_id: session_id || null, source: source || 'manual' })
      .select()
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    return NextResponse.json({ success: true, attendance: data })
  } catch (e: any) {
    console.error('Attendances POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update attendance status
export async function PUT(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const body = await request.json()
    const { id, status: newStatus } = body
    if (!id) return NextResponse.json({ error: 'Attendance id required' }, { status: 400 })

    // Fetch attendance for permission check
    const { data: existing } = await userSupabase.from('attendances').select('id, player_id, team_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })

    if (userData.role === 'player' && existing.player_id !== userData.id) {
      return NextResponse.json({ error: 'Players can only update their own attendance' }, { status: 403 })
    }
    if (userData.role === 'coach' && userData.team_id !== existing.team_id) {
      return NextResponse.json({ error: 'Coaches can only update their own team' }, { status: 403 })
    }
    if (!['admin', 'manager', 'coach', 'player'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error: updErr } = await userSupabase
      .from('attendances')
      .update({ status: newStatus })
      .eq('id', id)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Attendances PUT error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE attendance
export async function DELETE(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Attendance id required' }, { status: 400 })

    const { data: existing } = await userSupabase.from('attendances').select('id, team_id, player_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })

    if (userData.role === 'player' && existing.player_id !== userData.id) {
      return NextResponse.json({ error: 'Players can only delete their own attendance' }, { status: 403 })
    }
    if (userData.role === 'coach' && userData.team_id !== existing.team_id) {
      return NextResponse.json({ error: 'Coaches can only delete their own team' }, { status: 403 })
    }
    if (!['admin', 'manager', 'coach', 'player'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error: delErr } = await userSupabase.from('attendances').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Attendances DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}