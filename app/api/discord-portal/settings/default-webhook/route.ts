import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import getSupabaseAdmin from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

function getUserClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  return createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
}

async function getAdminUser(request: NextRequest) {
  const userClient = getUserClient(request)
  if (!userClient) return { error: 'Service unavailable', status: 503 }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Authorization header required', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token', status: 401 }
  const { data: userData, error: userError } = await userClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (userError || !userData) return { error: 'User not found', status: 404 }
  if (userData.role !== 'admin') return { error: 'Only admins can modify this setting', status: 403 }
  return { userId: userData.id }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if ('error' in admin) return NextResponse.json({ error: (admin as any).error }, { status: (admin as any).status })

    const { value } = await request.json()
    if (!value) return NextResponse.json({ error: 'Value is required' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('admin_config')
      .upsert({ key: 'default_public_webhook_id', value: String(value) }, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if ('error' in admin) return NextResponse.json({ error: (admin as any).error }, { status: (admin as any).status })

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('admin_config')
      .select('key, value')
      .eq('key', 'default_public_webhook_id')
      .single()

    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ value: data?.value || '' })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}