import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET - Fetch slots with filtering
export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from users table (source of truth)
    const { data: userData } = await userSupabase
      .from('users')
      .select('id, role, team_id, name, email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const view = url.searchParams.get('view') // 'current', 'archived', 'all'
    const month = url.searchParams.get('month') // YYYY-MM format
    const teamId = url.searchParams.get('team_id')

    let query = userSupabase
      .from('slots')
      .select('*, team:team_id(name, tier)')
      .order('date', { ascending: false })

    // Role-based filtering
    const userRole = (userData.role || '').toLowerCase()
    const shouldSeeAllData = ['admin', 'manager'].includes(userRole)

    if (!shouldSeeAllData) {
      if (userRole === 'coach' || userRole === 'player' || userRole === 'analyst') {
        if (userData.team_id) {
          query = query.eq('team_id', userData.team_id)
        } else {
          // No team assigned: return empty result
          return NextResponse.json({ slots: [], view: 'current', userRole })
        }
      }
    }

    // Team filtering (for admin/manager)
    if (teamId && shouldSeeAllData) {
      query = query.eq('team_id', teamId)
    }

    // Date filtering
    const today = format(new Date(), 'yyyy-MM-dd')

    if (userRole === 'player') {
      // Players only see today's slots
      query = query.eq('date', today)
    } else {
      switch (view) {
        case 'current':
          query = query.eq('date', today)
          break
        case 'archived':
          if (month) {
            const monthDate = new Date(month + '-01')
            const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
            const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')
            query = query.gte('date', startDate).lte('date', endDate)
          } else {
            query = query.lt('date', today)
          }
          break
        case 'all':
          // No date filtering
          break
        default:
          // Default to current for non-players
          query = query.eq('date', today)
      }
    }

    const { data: slots, error } = await query

    if (error) {
      console.error('Error fetching slots:', error)
      return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
    }

    return NextResponse.json({ 
      slots: slots || [],
      view: userRole === 'player' ? 'current' : (view || 'current'),
      userRole 
    })

  } catch (error) {
    console.error('Error in slots API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new slot (managers/coaches/admins only)
export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from users table
    const { data: userData } = await userSupabase
      .from('users')
      .select('id, role, team_id, name, email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    const userRole = (userData.role || '').toLowerCase()
    if (!['admin', 'manager', 'coach'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      team_id, 
      organizer, 
      time_range, 
      date, 
      slot_rate = 0, 
      number_of_slots = 1,
      match_count = 0,
      notes = ''
    } = body

    // Validate required fields
    if (!team_id || !organizer || !time_range || !date) {
      return NextResponse.json({ 
        error: 'Missing required fields: team_id, organizer, time_range, date' 
      }, { status: 400 })
    }

    // For coaches, ensure they can only create slots for their team
    if (userRole === 'coach' && team_id !== userData.team_id) {
      return NextResponse.json({ 
        error: 'Coaches can only create slots for their own team' 
      }, { status: 403 })
    }

    // Create slot
    const { data: slot, error: slotError } = await userSupabase
      .from('slots')
      .insert({
        team_id,
        organizer,
        time_range,
        date: format(new Date(date), 'yyyy-MM-dd'),
        slot_rate: Number(slot_rate),
        number_of_slots: Number(number_of_slots),
        match_count: Number(match_count),
        notes
      })
      .select('*, team:team_id(name, tier)')
      .single()

    if (slotError) {
      console.error('Error creating slot:', slotError)
      return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 })
    }

    // Create corresponding slot expense entry
    if (slot && slot.slot_rate > 0) {
      const { error: expenseError } = await userSupabase
        .from('slot_expenses')
        .insert({
          slot_id: slot.id,
          team_id: slot.team_id,
          rate: slot.slot_rate,
          total: slot.slot_rate * slot.number_of_slots
        })

      if (expenseError) {
        console.warn('Failed to create slot expense entry:', expenseError)
      }
    }

    // Send Discord notification if enabled
    try {
      const { notifySlotCreated } = await import('@/modules/discord-portal')
      await notifySlotCreated({
        slot_id: slot.id,
        team_id: slot.team_id,
        team_name: slot.team?.name || 'Unknown Team',
        organizer: slot.organizer,
        date: format(new Date(slot.date), 'PPP'),
        time_range: slot.time_range,
        match_count: slot.match_count || 0,
        slot_rate: slot.slot_rate || 0,
        created_by_name: userData.name || userData.email || 'Unknown',
        created_by_id: userData.id
      })
    } catch (discordError) {
      console.warn('Discord notification failed:', discordError)
    }

    return NextResponse.json({ 
      message: 'Slot created successfully',
      slot 
    })

  } catch (error) {
    console.error('Error in slot creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete slot (managers/coaches/admins only)
export async function DELETE(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from users table
    const { data: userData } = await userSupabase
      .from('users')
      .select('id, role, team_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    const userRole = (userData.role || '').toLowerCase()
    if (!['admin', 'manager', 'coach'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const slotId = url.searchParams.get('id')

    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 })
    }

    // Get slot details for permission check
    const { data: slot } = await userSupabase
      .from('slots')
      .select('team_id')
      .eq('id', slotId)
      .single()

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    // For coaches, ensure they can only delete slots for their team
    if (userRole === 'coach' && slot.team_id !== userData.team_id) {
      return NextResponse.json({ 
        error: 'Coaches can only delete slots for their own team' 
      }, { status: 403 })
    }

    // Delete slot (cascade will handle slot_expenses)
    const { error: deleteError } = await userSupabase
      .from('slots')
      .delete()
      .eq('id', slotId)

    if (deleteError) {
      console.error('Error deleting slot:', deleteError)
      return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Slot deleted successfully' })

  } catch (error) {
    console.error('Error in slot deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}