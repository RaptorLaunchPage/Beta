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
  const { data: userData, error: userError } = await userSupabase.from('users').select('id, role').eq('id', user.id).single()
  if (userError || !userData) return { error: 'User not found', status: 404 as const }
  return { userData, userSupabase }
}

export async function POST(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    if (!['admin', 'manager'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, tier, coach_id, status: teamStatus } = await request.json()
    if (!name) return NextResponse.json({ error: 'Team name required' }, { status: 400 })

    const { error: insErr } = await userSupabase.from('teams').insert({ name, tier: tier || null, coach_id: coach_id || null, status: teamStatus || 'active' })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })
    if (!['admin', 'manager'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, name, tier, coach_id, status: teamStatus } = await request.json()
    if (!id) return NextResponse.json({ error: 'Team id required' }, { status: 400 })

    const { error: updErr } = await userSupabase.from('teams').update({ name, tier, coach_id, status: teamStatus }).eq('id', id)
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
    if (!['admin', 'manager'].includes(userData.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Team id required' }, { status: 400 })

    const { error: delErr } = await userSupabase.from('teams').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}