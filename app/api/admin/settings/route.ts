import { NextRequest, NextResponse } from 'next/server'
import getSupabaseAdmin from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getCaller(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return { status: 503, error: 'Service unavailable' as const }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { status: 401, error: 'Authorization required' as const }
  const token = authHeader.replace('Bearer ', '')
  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await userClient.auth.getUser(token)
  if (!user) return { status: 401, error: 'Invalid token' as const }
  const { data: profile } = await userClient.from('users').select('id, role').eq('id', user.id).single()
  if (!profile) return { status: 404, error: 'User not found' as const }
  if (profile.role !== 'admin') return { status: 403, error: 'Forbidden' as const }
  return { status: 200 as const, user: profile }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const caller = await getCaller(request)
    if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })

    const supabaseAdmin = getSupabaseAdmin()
    const { data: rows, error: settingsError } = await supabaseAdmin
      .from('admin_config')
      .select('key, value')

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const settings: Record<string, string> = {}
    for (const r of rows || []) settings[r.key] = r.value

    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action as string | undefined
    const caller = await getCaller(request)
    if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })

    if (action === 'purge_non_admin_data') {
      const supabaseAdmin = getSupabaseAdmin()
      const tables = [
        'attendances',
        'performances',
        'rosters',
        'slots',
        'sessions',
        'slot_expenses',
        'winnings'
      ]
      for (const table of tables) {
        await supabaseAdmin.from(table).delete().neq('id', null)
      }
      await supabaseAdmin.from('users').delete().neq('role', 'admin')
      return NextResponse.json({ success: true })
    }

    // Save admin settings into admin_config
    const input = body.settings as Record<string, string | boolean> | undefined
    if (!input) {
      return NextResponse.json({ error: 'settings payload required' }, { status: 400 })
    }

    const entries = Object.entries(input).map(([key, value]) => ({ key, value: String(value) }))

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('admin_config')
      .upsert(entries, { onConflict: 'key' })

    if (error) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
