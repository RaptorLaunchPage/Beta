import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return { error: 'Service unavailable', status: 503 as const }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Authorization header required', status: 401 as const }
  const token = authHeader.replace('Bearer ', '')
  const userSupabase = createClient(supabaseUrl!, supabaseAnonKey!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token', status: 401 as const }
  const { data: userData, error: userError } = await userSupabase.from('users').select('id, role, team_id').eq('id', user.id).single()
  if (userError || !userData) return { error: 'User not found', status: 404 as const }
  return { userData, userSupabase }
}

export async function GET(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })

    // Permission: admin/manager can read any; coach only own team; analyst read-only own team; players denied
    if (userData.role === 'coach' && userData.team_id !== teamId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (userData.role === 'player') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error: qErr } = await userSupabase
      .from('rosters')
      .select('*, user:user_id(id, name, email)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    if (!['admin', 'manager', 'coach'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { team_id, user_id, in_game_role, contact_number, device_info } = await request.json()
    if (!team_id || !user_id) return NextResponse.json({ error: 'team_id and user_id are required' }, { status: 400 })
    if (userData.role === 'coach' && userData.team_id !== team_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: insErr } = await userSupabase.from('rosters').insert({ team_id, user_id, in_game_role, contact_number, device_info })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Also set user's team_id
    await userSupabase.from('users').update({ team_id }).eq('id', user_id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    if (!['admin', 'manager', 'coach'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, in_game_role, contact_number, device_info } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Permission check: ensure roster entry belongs to coach team
    const { data: existing } = await userSupabase.from('rosters').select('team_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (userData.role === 'coach' && userData.team_id !== existing.team_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: updErr } = await userSupabase.from('rosters').update({ in_game_role, contact_number, device_info }).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    if (!['admin', 'manager', 'coach'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: existing } = await userSupabase.from('rosters').select('team_id, user_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (userData.role === 'coach' && userData.team_id !== existing.team_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: delErr } = await userSupabase.from('rosters').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    // Clear user team assignment
    await userSupabase.from('users').update({ team_id: null }).eq('id', existing.user_id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}