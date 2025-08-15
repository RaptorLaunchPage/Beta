import { supabase } from "./supabase"
import { RoleAccess, ROLES, type UserRole } from "./role-system"

export class SecureProfileCreation {
  /**
   * Create a new user profile with proper default role
   * Updated to handle foreign key constraints properly
   */
  static async createProfile(userId: string, email: string, name?: string, provider?: string): Promise<{
    success: boolean
    profile?: any
    error?: string
  }> {
    try {
      console.log(`🔧 Creating profile for user: ${email} (ID: ${userId})`)
      
      // Skip session verification to avoid getSession() conflicts
      // The auth hook has already verified the user before calling this
      console.log('🔧 Skipping session verification (handled by auth hook)')
      
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (checkError) {
        console.error('❌ Error checking existing profile:', checkError)
        return {
          success: false,
          error: `Failed to check existing profile: ${checkError.message}`
        }
      }
      
      if (existingProfile) {
        console.log(`✅ Profile already exists for ${email}`)
        return {
          success: true,
          profile: existingProfile
        }
      }
      
      // Get safe default role - use pending_player consistently
      const defaultRole: UserRole = 'pending_player'
      const defaultRoleLevel = 10 // Pending role level
      
      // Create profile data - the user ID comes from authenticated session
      const profileData: {
        id: string;
        email: string;
        role: string;
        name?: string;
        discord_tag?: string;
        tier?: string;
        team_id?: string;
        avatar_url?: string;
      } = {
        id: userId, // This now references an existing auth.users.id
        email: email,
        name: name || email.split('@')[0] || 'User',
        role: defaultRole,
        role_level: defaultRoleLevel,
        onboarding_completed: false, // Explicitly set to false for new pending_player profiles
        created_at: new Date().toISOString()
      }
      
      if (provider) {
        profileData.provider = provider
      }
      
      console.log(`📝 Creating profile with role: ${defaultRole} for authenticated user`)
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Profile creation failed:', createError)
        
        // Provide specific error messages for common issues
        if (createError.code === '23514') {
          return {
            success: false,
            error: `Database role constraint violation. The role '${defaultRole}' is not allowed in the database.`
          }
        }
        
        if (createError.code === '23503') {
          return {
            success: false,
            error: `Foreign key constraint violation. User must be authenticated first. Please try logging in again.`
          }
        }
        
        if (createError.code === '23505') {
          // Unique constraint violation - profile might have been created by another request
          console.log('⚠️ Profile might have been created by another request, checking again...')
          const { data: retryProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
          
          if (retryProfile) {
            return {
              success: true,
              profile: retryProfile
            }
          }
        }
        
        return {
          success: false,
          error: `Failed to create profile: ${createError.message}`
        }
      }
      
      console.log(`✅ Profile created successfully for ${email}`)
      
      return {
        success: true,
        profile: newProfile
      }
      
    } catch (error: unknown) {
      console.error('❌ Profile creation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return {
        success: false,
        error: errorMessage
      }
    }
  }
  
  /**
   * Update user role (admin only)
   */
  static async updateUserRole(
    currentUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<{
    success: boolean
    profile?: any
    error?: string
  }> {
    try {
      console.log(`🔧 Updating user role: ${targetUserId} -> ${newRole}`)
      
      // Get current user's profile to verify permissions
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', currentUserId)
        .single()
      
      if (currentUserError || !currentUser) {
        return {
          success: false,
          error: 'Unable to verify your permissions'
        }
      }
      
      // Get target user's profile
      const { data: targetUser, error: targetUserError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', targetUserId)
        .single()
      
      if (targetUserError || !targetUser) {
        return {
          success: false,
          error: 'Target user not found'
        }
      }
      
      // Validate role assignment
      const validation = RoleAccess.validateRoleAssignment(currentUser.role, newRole)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }
      
      // Get role level for the new role
      const roleInfo = RoleAccess.getRoleInfo(newRole)
      
      // Update user role and role_level
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          role_level: roleInfo.level
        })
        .eq('id', targetUserId)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Role update failed:', updateError)
        return {
          success: false,
          error: `Failed to update role: ${updateError.message}`
        }
      }
      
      console.log(`✅ Role updated successfully for user: ${targetUserId}`)
      
      return {
        success: true,
        profile: updatedProfile
      }
      
    } catch (error: any) {
      console.error('❌ Role update error:', error)
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Emergency profile creation for admin use
   * This should only be used when the user is already authenticated
   */
  static async createAdminProfile(
    userId: string,
    email: string,
    name?: string
  ): Promise<{
    success: boolean
    profile?: any
    error?: string
  }> {
    try {
      console.log(`🚨 Creating emergency admin profile for: ${email}`)
      
      // Skip authentication check to avoid getSession() conflicts
      // This is an emergency function, caller is responsible for verification
      console.log('🚨 Emergency admin creation - skipping auth verification')
      
      const profileData = {
        id: userId, // Must reference existing auth.users.id
        email: email,
        name: name || 'Admin User',
        role: 'admin' as UserRole,
        role_level: 100,
        created_at: new Date().toISOString()
      }
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .upsert(profileData) // Use upsert to handle duplicates
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Admin profile creation failed:', createError)
        return {
          success: false,
          error: `Failed to create admin profile: ${createError.message}`
        }
      }
      
      console.log(`✅ Admin profile created successfully for ${email}`)
      
      return {
        success: true,
        profile: newProfile
      }
      
    } catch (error: any) {
      console.error('❌ Admin profile creation error:', error)
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  /**
   * Batch create profiles for authenticated users only
   * Note: This method assumes all users are already authenticated
   */
  static async createBatchProfiles(
    users: Array<{
      id: string
      email: string
      name?: string
      role?: UserRole
    }>
  ): Promise<{
    success: boolean
    profiles?: any[]
    errors?: string[]
  }> {
    try {
      console.log(`🔧 Creating ${users.length} profiles in batch`)
      
      // Note: This method doesn't verify each user is authenticated
      // It should only be used in admin contexts where users are known to exist
      const profilesData = users.map(user => ({
        id: user.id, // Must reference existing auth.users.id
        email: user.email,
        name: user.name || user.email.split('@')[0] || 'User',
        role: user.role || 'pending_player' as UserRole,
        role_level: user.role ? RoleAccess.getRoleInfo(user.role).level : 10,
        created_at: new Date().toISOString()
      }))
      
      const { data: newProfiles, error: createError } = await supabase
        .from('users')
        .upsert(profilesData)
        .select()
      
      if (createError) {
        console.error('❌ Batch profile creation failed:', createError)
        return {
          success: false,
          errors: [createError.message]
        }
      }
      
      console.log(`✅ ${newProfiles?.length || 0} profiles created successfully`)
      
      return {
        success: true,
        profiles: newProfiles
      }
      
    } catch (error: any) {
      console.error('❌ Batch profile creation error:', error)
      return {
        success: false,
        errors: [error.message || 'Unknown error occurred']
      }
    }
  }
}