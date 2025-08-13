import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function getUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, profile: null }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return { user: null, profile: null }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
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
