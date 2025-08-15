import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  handleCors
} from '@/lib/api-utils'

// GET - Fetch teams
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

    // Check permissions - allow players to see their own team data
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst', 'player']
    if (!checkRoleAccess(user.role, allowedRoles)) {
      return createErrorResponse({
        error: 'Insufficient permissions to view teams',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    let query = supabase
      .from('teams')
      .select('id, name, tier, status')
      .order('name', { ascending: true })

    // Role-based filtering
    if (checkRoleAccess(user.role, ['admin', 'manager'])) {
      // Admin and Manager can see all teams
      // No additional filtering needed
    } else if (user.role === 'player') {
      // Players can only see their own team
      if (!user.team_id) {
        return createErrorResponse({
          error: 'Player must be assigned to a team to view team data',
          code: 'NO_TEAM_ASSIGNED',
          status: 403
        })
      }
      query = query.eq('id', user.team_id)
    } else {
      // Coach, Analyst - can only see their assigned team
      if (user.team_id) {
        query = query.eq('id', user.team_id)
      } else {
        // If no team assigned, return empty array
        return createSuccessResponse([])
      }
    }

    const { data: teams, error: teamsError } = await query

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return createErrorResponse({
        error: 'Failed to fetch teams',
        code: 'DATABASE_ERROR',
        status: 500,
        details: teamsError.message
      })
    }

    return createSuccessResponse(teams || [])

  } catch (error) {
    console.error('Error in teams API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}