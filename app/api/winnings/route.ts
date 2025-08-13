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
    const timeframe = parseInt(searchParams.get('timeframe') || '0')
    const teamId = searchParams.get('teamId')

    let query = userSupabase
      .from('winnings')
      .select('*, slot:slot_id(id, organizer, time_range, date, number_of_slots, slot_rate), team:team_id(id, name)')
      .order('created_at', { ascending: false })

    if (timeframe > 0) {
      const start = new Date(); start.setDate(start.getDate() - timeframe)
      query = query.gte('created_at', start.toISOString())
    }

    if (['admin', 'manager'].includes(userData.role)) {
      if (teamId) query = query.eq('team_id', teamId)
    } else if (['coach', 'analyst', 'player'].includes(userData.role)) {
      if (userData.team_id) query = query.eq('team_id', userData.team_id)
      else return NextResponse.json([])
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error: qErr } = await query
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}