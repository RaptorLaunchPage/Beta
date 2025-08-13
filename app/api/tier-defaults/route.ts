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

export async function GET(request: NextRequest) {
  try {
    const { userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const { data, error: qErr } = await userSupabase.from('tier_defaults').select('*').order('tier')
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    if (!['admin', 'manager'].includes(userData!.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { tier, default_slot_rate } = await request.json()
    if (!tier || typeof default_slot_rate !== 'number') {
      return NextResponse.json({ error: 'tier and default_slot_rate required' }, { status: 400 })
    }

    const { error: updErr } = await userSupabase
      .from('tier_defaults')
      .update({ default_slot_rate, updated_at: new Date().toISOString() })
      .eq('tier', tier)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}