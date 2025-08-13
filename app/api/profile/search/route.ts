import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'

// GET /api/profile/search - Search profiles for admin/manager
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getUser(request)
    
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and manager can search all profiles
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const role = url.searchParams.get('role')
    const team = url.searchParams.get('team')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    let queryBuilder = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        display_name,
        role,
        team_id,
        bgmi_id,
        bgmi_tier,
        bgmi_points,
        status,
        avatar_url,
        last_login,
        created_at,
        team:team_id(id, name, tier),
        profile_visibility,
        onboarding_completed
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(`
        full_name.ilike.%${query}%,
        display_name.ilike.%${query}%,
        email.ilike.%${query}%,
        bgmi_id.ilike.%${query}%
      `)
    }
    
    if (role) {
      queryBuilder = queryBuilder.eq('role', role)
    }
    
    if (team) {
      queryBuilder = queryBuilder.eq('team_id', team)
    }
    
    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }
    
    const { data: profiles, error } = await queryBuilder
    
    if (error) {
      console.error('Profile search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
    
    // Get total count for pagination
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({ 
      profiles: profiles || [],
      total: count || 0,
      limit,
      offset
    })
    
  } catch (error: any) {
    console.error('Profile search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
