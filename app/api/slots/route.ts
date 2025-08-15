import { NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  checkTeamAccess,
  validateRequiredFields,
  isValidUuid,
  isValidDate,
  handleCors
} from '@/lib/api-utils'

// GET - Fetch slots with filtering
export async function GET(request: Request) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request as any)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request as any)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    const url = new URL(request.url)
    const view = url.searchParams.get('view') // 'current', 'archived', 'all'
    const month = url.searchParams.get('month') // YYYY-MM format
    const teamId = url.searchParams.get('team_id')
    const id = url.searchParams.get('id')

    // Validate UUID if provided
    if (id && !isValidUuid(id)) {
      return createErrorResponse({
        error: 'Invalid slot ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Validate team ID if provided
    if (teamId && !isValidUuid(teamId)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    let query = supabase
      .from('slots')
      .select('*, team:team_id(name, tier)')
      .order('date', { ascending: false })

    // Role-based filtering
    const userRole = (user.role || '').toLowerCase()
    const shouldSeeAllData = checkRoleAccess(userRole, ['admin', 'manager'])

    if (!shouldSeeAllData) {
      if (checkRoleAccess(userRole, ['coach', 'player', 'analyst'])) {
        if (user.team_id) {
          query = query.eq('team_id', user.team_id)
        } else {
          // No team assigned: return empty result
          return createSuccessResponse([], 'No slots found for user without team')
        }
      }
    }

    // If id filter provided, apply it and bypass date filters
    if (id) {
      query = query.eq('id', id)
      if (teamId && shouldSeeAllData) {
        query = query.eq('team_id', teamId)
      }
    } else {
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
              if (!isValidDate(month + '-01')) {
                return createErrorResponse({
                  error: 'Invalid month format. Use YYYY-MM',
                  code: 'INVALID_DATE_FORMAT',
                  status: 400
                })
              }
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
    }

    const { data: slots, error } = await query

    if (error) {
      console.error('Error fetching slots:', error)
      return createErrorResponse({
        error: 'Failed to fetch slots',
        code: 'DATABASE_ERROR',
        status: 500,
        details: error.message
      })
    }

    return createSuccessResponse({
      slots: slots || [],
      view: userRole === 'player' ? 'current' : (view || 'current'),
      userRole
    })

  } catch (error) {
    console.error('Error in slots API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// POST - Create new slot (managers/coaches/admins only)
export async function POST(request: Request) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request as any)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request as any)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check permissions
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
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
    const validation = validateRequiredFields(body, ['team_id', 'organizer', 'time_range', 'date'])
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate UUIDs
    if (!isValidUuid(team_id)) {
      return createErrorResponse({
        error: 'Invalid team ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Validate date
    if (!isValidDate(date)) {
      return createErrorResponse({
        error: 'Invalid date format',
        code: 'INVALID_DATE',
        status: 400
      })
    }

    // For coaches, ensure they can only create slots for their team
    if (user.role === 'coach' && team_id !== user.team_id) {
      return createErrorResponse({
        error: 'Coaches can only create slots for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    // Create slot
    const { data: slot, error: slotError } = await supabase
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
      return createErrorResponse({
        error: 'Failed to create slot',
        code: 'DATABASE_ERROR',
        status: 500,
        details: slotError.message
      })
    }

    // Create corresponding slot expense entry
    if (slot && slot.slot_rate > 0) {
      const { error: expenseError } = await supabase
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
        created_by_name: user.name || user.email || 'Unknown',
        created_by_id: user.id
      })
    } catch (discordError) {
      console.warn('Discord notification failed:', discordError)
    }

    return createSuccessResponse(slot, 'Slot created successfully', 201)

  } catch (error) {
    console.error('Error in slot creation:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// DELETE - Delete slot (managers/coaches/admins only)
export async function DELETE(request: Request) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request as any)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request as any)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check permissions
    if (!checkRoleAccess(user.role, ['admin', 'manager', 'coach'])) {
      return createErrorResponse({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const url = new URL(request.url)
    const slotId = url.searchParams.get('id')

    if (!slotId) {
      return createErrorResponse({
        error: 'Slot ID is required',
        code: 'MISSING_SLOT_ID',
        status: 400
      })
    }

    // Validate UUID
    if (!isValidUuid(slotId)) {
      return createErrorResponse({
        error: 'Invalid slot ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }

    // Get slot details for permission check
    const { data: slot } = await supabase
      .from('slots')
      .select('team_id')
      .eq('id', slotId)
      .single()

    if (!slot) {
      return createErrorResponse({
        error: 'Slot not found',
        code: 'SLOT_NOT_FOUND',
        status: 404
      })
    }

    // For coaches, ensure they can only delete slots for their team
    if (user.role === 'coach' && slot.team_id !== user.team_id) {
      return createErrorResponse({
        error: 'Coaches can only delete slots for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    // Delete slot (cascade will handle slot_expenses)
    const { error: deleteError } = await supabase
      .from('slots')
      .delete()
      .eq('id', slotId)

    if (deleteError) {
      console.error('Error deleting slot:', deleteError)
      return createErrorResponse({
        error: 'Failed to delete slot',
        code: 'DATABASE_ERROR',
        status: 500,
        details: deleteError.message
      })
    }

    return createSuccessResponse(null, 'Slot deleted successfully')

  } catch (error) {
    console.error('Error in slot deletion:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}