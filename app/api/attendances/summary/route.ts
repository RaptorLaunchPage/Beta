import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getWindow(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return { error: 'Service unavailable', status: 503 }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Authorization header required', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  const userSupabase = createClient(supabaseUrl!, supabaseAnonKey!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token', status: 401 }
  const { data: userData, error: userError } = await userSupabase.from('users').select('id, role, team_id').eq('id', user.id).single()
  if (userError || !userData) return { error: 'User not found', status: 404 }
  return { userData, userSupabase }
}

export async function GET(request: NextRequest) {
  try {
    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error || !userSupabase) return NextResponse.json({ error }, { status: status || 500 })

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const teamId = searchParams.get('teamId')
    const { start, end } = getWindow(timeframe)

    let query = userSupabase
      .from('attendances')
      .select('status, team_id, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (['admin', 'manager'].includes(userData.role)) {
      if (teamId) query = query.eq('team_id', teamId)
    } else if (['coach', 'analyst'].includes(userData.role)) {
      if (userData.team_id) query = query.eq('team_id', userData.team_id)
      else return NextResponse.json({ attendanceRate: 0 })
    } else if (userData.role === 'player') {
      query = query.eq('player_id', userData.id)
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error: qErr } = await query
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

    const total = data?.length || 0
    const attended = (data || []).filter(a => ['present', 'late', 'auto'].includes(a.status)).length
    const attendanceRate = total > 0 ? (attended / total) * 100 : 0

    return NextResponse.json({ attendanceRate })
  } catch (e: any) {
    console.error('Attendance summary error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}