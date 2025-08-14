import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function getUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, profile: null }
    }

    const token = authHeader.substring(7)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return { user: null, profile: null }
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return { user: null, profile: null }
    }

    // Get user profile using user-bound client (RLS-aware)
    const { data: profile, error: profileError } = await userClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return { user: null, profile: null }
    }

    return { user, profile }
  } catch (error) {
    console.error('getUser error:', error)
    return { user: null, profile: null }
  }
}
