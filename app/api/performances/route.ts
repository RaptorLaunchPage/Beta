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
    
    // Handle both legacy and new format
    const {
      // New format fields
      match_type,
      map,
      kills,
      assists,
      damage,
      survival_time,
      placement,
      team_id,
      slot_id,
      
      // Legacy format fields (for backward compatibility)
      match_number,
      slot,
      player_id,
      added_by
    } = body

    // Map legacy fields to new format
    const finalMatchType = match_type || 'practice' // Default to practice if not specified
    const finalMap = map
    const finalKills = kills || 0
    const finalAssists = assists || 0
    const finalDamage = damage || 0
    const finalSurvivalTime = survival_time || 0
    const finalPlacement = placement
    const finalTeamId = team_id || user.team_id
    const finalSlotId = slot_id || slot // Use slot_id if provided, otherwise use legacy slot
    const finalPlayerId = player_id || user.id

    // Validate required fields (using the mapped values)
    const requiredFields = ['map', 'kills', 'assists', 'damage', 'survival_time', 'placement']
    const validation = validateRequiredFields({
      map: finalMap,
      kills: finalKills,
      assists: finalAssists,
      damage: finalDamage,
      survival_time: finalSurvivalTime,
      placement: finalPlacement
    }, requiredFields)
    
    if (!validation.valid) {
      return createErrorResponse({
        error: `Missing required fields: ${validation.missing.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate numeric fields
    const numericFields = ['kills', 'assists', 'damage', 'survival_time', 'placement']
    const numericValues = [finalKills, finalAssists, finalDamage, finalSurvivalTime, finalPlacement]
    for (let i = 0; i < numericFields.length; i++) {
      if (typeof numericValues[i] !== 'number' || numericValues[i] < 0) {
        return createErrorResponse({
          error: `${numericFields[i]} must be a non-negative number`,
          code: 'INVALID_NUMERIC_VALUE',
          status: 400
        })
      }
    }

    // For players, ensure they can only create performances for themselves
    if (user.role === 'player') {
      if (finalTeamId && finalTeamId !== user.team_id) {
        return createErrorResponse({
          error: 'Players can only create performances for their own team',
          code: 'TEAM_ACCESS_DENIED',
          status: 403
        })
      }
      if (finalPlayerId !== user.id) {
        return createErrorResponse({
          error: 'Players can only create performances for themselves',
          code: 'PLAYER_ACCESS_DENIED',
          status: 403
        })
      }
    }

    // For coaches, ensure they can only create performances for their team
    if (user.role === 'coach' && finalTeamId && finalTeamId !== user.team_id) {
      return createErrorResponse({
        error: 'Coaches can only create performances for their own team',
        code: 'TEAM_ACCESS_DENIED',
        status: 403
      })
    }

    // Create performance
    const performanceData = {
      player_id: finalPlayerId,
      team_id: finalTeamId,
      match_type: finalMatchType,
      map: finalMap,
      kills: finalKills,
      assists: finalAssists,
      damage: finalDamage,
      survival_time: finalSurvivalTime,
      placement: finalPlacement,
      slot_id: finalSlotId || null
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