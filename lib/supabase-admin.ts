import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

let cached: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin client missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  cached = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } })
  return cached
}

export default getSupabaseAdmin