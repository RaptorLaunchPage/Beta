import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  validateRequiredFields,
  isValidUuid,
  handleCors
} from '@/lib/api-utils'

// GET - Fetch performances
export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
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

    // First check if performances table exists and is accessible
    const { data: testQuery, error: testError } = await supabase
      .from("performances")
      .select("id")
      .limit(1)

    if (testError) {
      console.error('Performances table access error:', testError)
      // If table doesn't exist or no access, return empty array instead of error
      if (testError.code === 'PGRST116' || testError.message?.includes('relation') || testError.message?.includes('does not exist')) {
        return createSuccessResponse([])
      }
      return createErrorResponse({
        error: `Database error: ${testError.message}`,
        code: 'DATABASE_ERROR',
        status: 500
      })
    }

    // Try a simplified query first without relationships
    let query = supabase
      .from("performances")
      .select("*, users:player_id(id, name, email), teams:team_id(id, name, tier)", { count: 'exact' })

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '0')
    const teamId = searchParams.get('teamId')
    const playerId = searchParams.get('playerId')
    const map = searchParams.get('map')
    const limitParam = parseInt(searchParams.get('limit') || '0')
    const limit = limitParam > 0 ? Math.min(limitParam, 1000) : 0

    // Calculate date range if timeframe is specified
    if (timeframe > 0) {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeframe)
      query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
    }

    // Apply filters
    if (teamId) {
      if (!isValidUuid(teamId)) {
        return createErrorResponse({
          error: 'Invalid team ID format',
          code: 'INVALID_UUID',
          status: 400
        })
      }
      query = query.eq('team_id', teamId)
    }

    if (playerId) {
      if (!isValidUuid(playerId)) {
        return createErrorResponse({
          error: 'Invalid player ID format',
          code: 'INVALID_UUID',
          status: 400
        })
      }
      query = query.eq('player_id', playerId)
    }

    if (map) {
      query = query.eq('map', map)
    }

    // Apply role-based access control
    if (user.role === 'player') {
      if (user.team_id) {
        query = query.or(`player_id.eq.${user.id},team_id.eq.${user.team_id}`)
      } else {
        query = query.eq('player_id', user.id)
      }
    } else if (user.role === 'coach' && user.team_id) {
      query = query.eq('team_id', user.team_id)
    } else if (user.role === 'analyst' && user.team_id) {
      query = query.eq('team_id', user.team_id)
    }

    // Apply limit if specified
    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data: performances, error, count } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching performances:', error)
      return createErrorResponse({
        error: 'Failed to fetch performances',
        code: 'DATABASE_ERROR',
        status: 500,
        details: error.message
      })
    }

    return createSuccessResponse(performances || [])

  } catch (error) {
    console.error('Error in performances API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// POST - Create new performance
export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
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
    const allowedRoles = ['admin', 'manager', 'coach', 'player']
    if (!checkRoleAccess(user.role, allowedRoles)) {
      return createErrorResponse({
        error: 'Insufficient permissions to create performance',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const body = await request.json()
    const {
      match_type,
      map,
      kills,
      assists,
      damage,
      survival_time,
      placement,
      team_id,
      slot_id
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['match_type', 'kills', 'assists', 'damage', 'survival_time', 'placement'])
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate numeric fields
    const numericFields = ['kills', 'assists', 'damage', 'survival_time', 'placement']
    for (const field of numericFields) {
      if (typeof body[field] !== 'number' || body[field] < 0) {
        return createErrorResponse({
          error: `${field} must be a non-negative number`,
          code: 'INVALID_NUMERIC_VALUE',
          status: 400
        })
      }
    }

    // Validate match_type
    const validMatchTypes = ['practice', 'tournament', 'scrim']
    if (!validMatchTypes.includes(match_type)) {
      return createErrorResponse({
        error: 'Invalid match type',
        code: 'INVALID_MATCH_TYPE',
        status: 400
      })
    }

    // For players, ensure they can only create performances for themselves
    if (user.role === 'player') {
      if (team_id && team_id !== user.team_id) {
        return createErrorResponse({
          error: 'Players can only create performances for their own team',
          code: 'TEAM_ACCESS_DENIED',
          status: 403
        })
      }
    }

    // For coaches, ensure they can only create performances for their team
    if (user.role === 'coach' && team_id && team_id !== user.team_id) {
      return createErrorResponse({
        error: 'Coaches can only create performances for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    // Create performance
    const performanceData = {
      player_id: user.id,
      team_id: team_id || user.team_id,
      match_type,
      map: map || null,
      kills,
      assists,
      damage,
      survival_time,
      placement,
      slot_id: slot_id || null
    }

    const { data: performance, error: insertError } = await supabase
      .from('performances')
      .insert(performanceData)
      .select('*, users:player_id(id, name, email), teams:team_id(id, name, tier)')
      .single()

    if (insertError) {
      console.error('Error creating performance:', insertError)
      return createErrorResponse({
        error: 'Failed to create performance',
        code: 'DATABASE_ERROR',
        status: 500,
        details: insertError.message
      })
    }

    return createSuccessResponse(performance, 'Performance created successfully', 201)

  } catch (error) {
    console.error('Error in performance creation:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}