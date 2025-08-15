import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  checkRoleAccess,
  handleCors
} from '@/lib/api-utils'

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

    // Check permissions - only admin and manager can create teams
    if (!checkRoleAccess(user.role, ['admin', 'manager'])) {
      return createErrorResponse({
        error: 'Insufficient permissions to create teams',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { name, tier, coach_id, status: teamStatus } = await request.json()
    
    if (!name) {
      return createErrorResponse({
        error: 'Team name is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({ 
        name, 
        tier: tier || 'T4', 
        coach_id: coach_id || null, 
        status: teamStatus || 'active' 
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating team:', insertError)
      return createErrorResponse({
        error: 'Failed to create team',
        code: 'DATABASE_ERROR',
        status: 500,
        details: insertError.message
      })
    }

    return createSuccessResponse(team, 'Team created successfully', 201)

  } catch (error) {
    console.error('Error in team creation:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

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

    // Check permissions - only admin and manager can update teams
    if (!checkRoleAccess(user.role, ['admin', 'manager'])) {
      return createErrorResponse({
        error: 'Insufficient permissions to update teams',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { id, name, tier, coach_id, status: teamStatus } = await request.json()
    
    if (!id) {
      return createErrorResponse({
        error: 'Team ID is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update({ 
        name, 
        tier, 
        coach_id, 
        status: teamStatus 
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating team:', updateError)
      return createErrorResponse({
        error: 'Failed to update team',
        code: 'DATABASE_ERROR',
        status: 500,
        details: updateError.message
      })
    }

    return createSuccessResponse(team, 'Team updated successfully')

  } catch (error) {
    console.error('Error in team update:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Check permissions - only admin and manager can delete teams
    if (!checkRoleAccess(user.role, ['admin', 'manager'])) {
      return createErrorResponse({
        error: 'Insufficient permissions to delete teams',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return createErrorResponse({
        error: 'Team ID is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting team:', deleteError)
      return createErrorResponse({
        error: 'Failed to delete team',
        code: 'DATABASE_ERROR',
        status: 500,
        details: deleteError.message
      })
    }

    return createSuccessResponse({ success: true }, 'Team deleted successfully')

  } catch (error) {
    console.error('Error in team deletion:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}