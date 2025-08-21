import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  validateRequiredFields,
  isValidUuid,
  handleCors
} from '@/lib/api-utils'
import { canViewProfile, canEditProfile } from '@/lib/profile-utils'
import { supabase } from '@/lib/supabase'

// GET /api/profile - Get current user's profile or specific user profile
export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase: userSupabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !userSupabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')
    
    // If no userId specified, return current user's profile
    if (!targetUserId) {
      return createSuccessResponse({ profile: user })
    }
    
    // Validate UUID
    if (!isValidUuid(targetUserId)) {
      return createErrorResponse({
        error: 'Invalid user ID format',
        code: 'INVALID_UUID',
        status: 400
      })
    }
    
    // Fetch target user's profile
    const { data: targetProfile, error } = await userSupabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, tier),
        roster:rosters!inner(in_game_role, contact_number, device_info)
      `)
      .eq('id', targetUserId)
      .single()
    
    if (error || !targetProfile) {
      return createErrorResponse({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
        status: 404
      })
    }
    
    // Check permissions
    const hasAccess = canViewProfile(
      user.role as any,
      user.team_id,
      targetUserId,
      targetProfile.team_id,
      targetProfile.profile_visibility as any,
      user.id
    )
    
    if (!hasAccess) {
      return createErrorResponse({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        status: 403
      })
    }
    
    return createSuccessResponse({ profile: targetProfile })
    
  } catch (error: any) {
    console.error('Profile fetch error:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// PUT /api/profile - Update profile
export async function PUT(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase: userSupabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user || !userSupabase) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    const body = await request.json()
    const { userId, updates } = body
    
    const targetUserId = userId || user.id
    
    // Check edit permissions
    let targetProfile = user
    if (targetUserId !== user.id) {
      const { data, error } = await userSupabase
        .from('users')
        .select('id, role, team_id')
        .eq('id', targetUserId)
        .single()
        
      if (error || !data) {
        return createErrorResponse({
          error: 'Target user not found',
          code: 'USER_NOT_FOUND',
          status: 404
        })
      }
      
      targetProfile = data
    }
    
    const hasEditAccess = canEditProfile(
      user.role as any,
      user.team_id,
      targetUserId,
      targetProfile.team_id,
      user.id
    )
    
    if (!hasEditAccess) {
      return createErrorResponse({
        error: 'Edit access denied',
        code: 'EDIT_ACCESS_DENIED',
        status: 403
      })
    }

    // Validate updates object
    if (!updates || typeof updates !== 'object') {
      return createErrorResponse({
        error: 'Updates object is required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    // Filter out sensitive fields that shouldn't be updated via this endpoint
    const allowedFields = [
      'name', 'bio', 'contact_number', 'in_game_role', 'device_info', 
      'device_model', 'ram', 'fps', 'storage', 'gyroscope_enabled',
      'instagram_handle', 'discord_id', 'favorite_game', 'gaming_experience',
      'display_name', 'full_name', 'experience', 'preferred_role',
      'favorite_games', 'bgmi_id', 'bgmi_tier', 'bgmi_points',
      'sensitivity_settings', 'control_layout', 'hud_layout_code',
      'game_stats', 'achievements'
    ]

    const filteredUpdates: any = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return createErrorResponse({
        error: 'No valid fields to update',
        code: 'NO_VALID_UPDATES',
        status: 400
      })
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await userSupabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return createErrorResponse({
        error: 'Failed to update profile',
        code: 'DATABASE_ERROR',
        status: 500,
        details: updateError.message
      })
    }

    return createSuccessResponse({ profile: updatedProfile }, 'Profile updated successfully')
    
  } catch (error: any) {
    console.error('Profile update error:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}
