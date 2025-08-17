import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  handleCors
} from '@/lib/api-utils'

// GET - Fetch users with role-based filtering
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

    // Check permissions - allow players to see their teammates
    const allowedRoles = ['admin', 'manager', 'coach', 'analyst', 'player']
    if (!checkRoleAccess(user.role, allowedRoles)) {
      return createErrorResponse({
        error: 'Insufficient permissions to view users',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    let query = supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    // Role-based filtering
    if (checkRoleAccess(user.role, ['admin', 'manager', 'analyst'])) {
      // Admin, manager, and analyst can see all users
      // No additional filtering needed
    } else if (user.role === 'coach' && user.team_id) {
      // Coaches can only see users in their team
      query = query.eq('team_id', user.team_id)
    } else if (user.role === 'player') {
      // Players can see their teammates and themselves
      if (!user.team_id) {
        // If player has no team, they can only see themselves
        query = query.eq('id', user.id)
      } else {
        // Players can see all users in their team
        query = query.eq('team_id', user.team_id)
      }
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return createErrorResponse({
        error: 'Failed to fetch users',
        code: 'DATABASE_ERROR',
        status: 500,
        details: usersError.message
      })
    }

    return createSuccessResponse(users || [])

  } catch (error) {
    console.error('Error in users API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// PUT - Update user role and team
export async function PUT(request: NextRequest) {
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

    // Check permissions - only admin can update user roles
    if (user.role !== 'admin') {
      return createErrorResponse({
        error: 'Only administrators can update user roles',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { userId, role, team_id } = await request.json()

    if (!userId || !role) {
      return createErrorResponse({
        error: 'User ID and role are required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'coach', 'analyst', 'player', 'pending_player']
    if (!validRoles.includes(role)) {
      return createErrorResponse({
        error: 'Invalid role specified',
        code: 'INVALID_ROLE',
        status: 400
      })
    }

    // Use bulletproof function to update user role
    const { data: result, error: updateError } = await supabase
      .rpc('bulletproof_user_update', {
        p_user_id: userId,
        p_role: role,
        p_team_id: team_id || null
      })

    if (updateError || !result) {
      console.error('Error updating user:', updateError)
      return createErrorResponse({
        error: 'Failed to update user',
        code: 'DATABASE_ERROR',
        status: 500,
        details: updateError?.message
      })
    }

    // Check if the function returned an error internally
    if (result.error) {
      console.error('Update function error:', result.error)
      return createErrorResponse({
        error: result.error,
        code: 'UPDATE_FUNCTION_ERROR',
        status: 500
      })
    }

    return createSuccessResponse({
      user: result
    }, 'User updated successfully')

  } catch (error) {
    console.error('Error in users PUT API:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}