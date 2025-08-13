import { Database } from '@/lib/supabase'

export type UserProfile = Database['public']['Tables']['users']['Row']
export type UserProfileUpdate = Database['public']['Tables']['users']['Update']

// BGMI Tier Rankings (ordered by skill level)
export const BGMI_TIERS = [
  'Bronze',
  'Silver', 
  'Gold',
  'Platinum',
  'Diamond',
  'Crown',
  'Ace',
  'Conqueror'
] as const

export type BGMITier = typeof BGMI_TIERS[number]

// Control Layout options
export const CONTROL_LAYOUTS = [
  '2-finger',
  '3-finger',
  '4-finger', 
  '5-finger',
  '6-finger'
] as const

export type ControlLayout = typeof CONTROL_LAYOUTS[number]

// Profile visibility options
export const PROFILE_VISIBILITY = [
  'public',
  'team', 
  'private'
] as const

export type ProfileVisibility = typeof PROFILE_VISIBILITY[number]

// Role-based permissions
export const PROFILE_PERMISSIONS = {
  admin: {
    canViewAll: true,
    canEditAll: true,
    canViewTeam: true,
    canEditTeam: true,
    canViewOwn: true,
    canEditOwn: true,
  },
  manager: {
    canViewAll: true,
    canEditAll: true,
    canViewTeam: true,
    canEditTeam: true,
    canViewOwn: true,
    canEditOwn: true,
  },
  coach: {
    canViewAll: false,
    canEditAll: false,
    canViewTeam: true,
    canEditTeam: true,
    canViewOwn: true,
    canEditOwn: true,
  },
  analyst: {
    canViewAll: false,
    canEditAll: false,
    canViewTeam: true,
    canEditTeam: false,
    canViewOwn: true,
    canEditOwn: true,
  },
  player: {
    canViewAll: false,
    canEditAll: false,
    canViewTeam: true,
    canEditTeam: false,
    canViewOwn: true,
    canEditOwn: true,
  },
  pending_player: {
    canViewAll: false,
    canEditAll: false,
    canViewTeam: false,
    canEditTeam: false,
    canViewOwn: true,
    canEditOwn: true,
  },
  tryout: {
    canViewAll: false,
    canEditAll: false,
    canViewTeam: false,
    canEditTeam: false,
    canViewOwn: true,
    canEditOwn: true,
  },
} as const

export type UserRole = keyof typeof PROFILE_PERMISSIONS

// Check if user can view a profile
export function canViewProfile(
  viewerRole: UserRole,
  viewerTeamId: string | null,
  targetUserId: string,
  targetTeamId: string | null,
  targetVisibility: ProfileVisibility | null,
  viewerUserId: string
): boolean {
  const permissions = PROFILE_PERMISSIONS[viewerRole]
  
  // Can always view own profile
  if (viewerUserId === targetUserId) {
    return true
  }
  
  // Admin and manager can view all
  if (permissions.canViewAll) {
    return true
  }
  
  // Coach can view team members
  if (permissions.canViewTeam && viewerTeamId && viewerTeamId === targetTeamId) {
    return true
  }
  
  // Check visibility settings
  if (targetVisibility === 'public') {
    return true
  }
  
  if (targetVisibility === 'team' && viewerTeamId && viewerTeamId === targetTeamId) {
    return true
  }
  
  return false
}

// Check if user can edit a profile
export function canEditProfile(
  editorRole: UserRole,
  editorTeamId: string | null,
  targetUserId: string,
  targetTeamId: string | null,
  editorUserId: string
): boolean {
  const permissions = PROFILE_PERMISSIONS[editorRole]
  
  // Can always edit own profile
  if (editorUserId === targetUserId) {
    return true
  }
  
  // Admin and manager can edit all
  if (permissions.canEditAll) {
    return true
  }
  
  // Coach can edit team members
  if (permissions.canEditTeam && editorTeamId && editorTeamId === targetTeamId) {
    return true
  }
  
  return false
}

// Get fields that a role can edit
export function getEditableFields(
  editorRole: UserRole,
  isOwnProfile: boolean,
  isTeamMember: boolean
): {
  personal: string[]
  gaming: string[]
  device: string[]
  social: string[]
  system: string[]
} {
  const basePersonal = ['full_name', 'display_name', 'bio', 'date_of_birth', 'address']
  const baseGaming = ['bgmi_id', 'bgmi_tier', 'bgmi_points', 'preferred_role', 'in_game_role', 'control_layout', 'sensitivity_settings', 'hud_layout_code', 'game_stats', 'achievements']
  const baseDevice = ['device_info', 'device_model', 'ram', 'fps', 'storage', 'gyroscope_enabled']
  const baseSocial = ['contact_number', 'instagram_handle', 'discord_id', 'social_links', 'emergency_contact_name', 'emergency_contact_number']
  const baseSystem = ['profile_visibility', 'auto_sync_tryout_data', 'preferred_language', 'timezone']
  
  if (editorRole === 'admin' || editorRole === 'manager') {
    return {
      personal: [...basePersonal, 'email', 'name'],
      gaming: [...baseGaming, 'experience', 'gaming_experience', 'favorite_game', 'favorite_games'],
      device: baseDevice,
      social: baseSocial,
      system: [...baseSystem, 'role', 'team_id', 'status', 'role_level']
    }
  }
  
  if (editorRole === 'coach' && isTeamMember && !isOwnProfile) {
    return {
      personal: ['full_name', 'display_name'],
      gaming: ['in_game_role', 'preferred_role'],
      device: [],
      social: ['contact_number', 'emergency_contact_name', 'emergency_contact_number'],
      system: []
    }
  }
  
  // Own profile - full access except system-level fields
  if (isOwnProfile) {
    return {
      personal: basePersonal,
      gaming: [...baseGaming, 'experience', 'gaming_experience', 'favorite_game', 'favorite_games'],
      device: baseDevice,
      social: baseSocial,
      system: baseSystem
    }
  }
  
  // No access
  return {
    personal: [],
    gaming: [],
    device: [],
    social: [],
    system: []
  }
}

// Format BGMI tier with emoji
export function formatBGMITier(tier: BGMITier | null): string {
  if (!tier) return 'Unranked'
  
  const tierEmojis = {
    'Bronze': '🥉',
    'Silver': '🥈', 
    'Gold': '🥇',
    'Platinum': '💎',
    'Diamond': '💍',
    'Crown': '👑',
    'Ace': '🏆',
    'Conqueror': '⚔️'
  }
  
  return `${tierEmojis[tier]} ${tier}`
}

// Calculate profile completion percentage
export function calculateProfileCompletion(profile: UserProfile): number {
  const requiredFields = [
    'full_name',
    'display_name', 
    'contact_number',
    'bio',
    'preferred_role',
    'experience',
    'bgmi_id',
    'device_info',
    'control_layout'
  ]
  
  const optionalFields = [
    'bgmi_tier',
    'bgmi_points',
    'sensitivity_settings',
    'hud_layout_code',
    'game_stats',
    'achievements',
    'social_links',
    'emergency_contact_name',
    'emergency_contact_number',
    'date_of_birth',
    'address'
  ]
  
  let completed = 0
  let total = requiredFields.length + optionalFields.length
  
  // Check required fields (weighted more heavily)
  requiredFields.forEach(field => {
    if (profile[field as keyof UserProfile]) {
      completed += 2 // Required fields count double
    }
  })
  
  // Check optional fields
  optionalFields.forEach(field => {
    if (profile[field as keyof UserProfile]) {
      completed += 1
    }
  })
  
  // Adjust total to account for weighted required fields
  total = requiredFields.length * 2 + optionalFields.length
  
  return Math.round((completed / total) * 100)
}

// Get profile status based on completion and role
export function getProfileStatus(profile: UserProfile): {
  status: 'complete' | 'incomplete' | 'pending' | 'needs_attention'
  message: string
  color: 'green' | 'yellow' | 'red' | 'blue'
} {
  const completion = calculateProfileCompletion(profile)
  
  if (profile.role === 'pending_player' && !profile.onboarding_completed) {
    return {
      status: 'pending',
      message: 'Complete onboarding to activate account',
      color: 'blue'
    }
  }
  
  if (completion < 50) {
    return {
      status: 'needs_attention', 
      message: 'Profile needs more information',
      color: 'red'
    }
  }
  
  if (completion < 80) {
    return {
      status: 'incomplete',
      message: 'Profile could use more details',
      color: 'yellow'
    }
  }
  
  return {
    status: 'complete',
    message: 'Profile is complete',
    color: 'green'
  }
}

// Default sensitivity settings for BGMI
export const DEFAULT_SENSITIVITY_SETTINGS = {
  camera: {
    free_look: 95,
    tpp_no_scope: 95,
    fpp_no_scope: 95,
    red_dot: 55,
    '2x_scope': 35,
    '3x_scope': 25,
    '4x_scope': 20,
    '6x_scope': 15,
    '8x_scope': 12
  },
  ads: {
    tpp_no_scope: 95,
    fpp_no_scope: 95,
    red_dot: 55,
    '2x_scope': 35,
    '3x_scope': 25,
    '4x_scope': 20,
    '6x_scope': 15,
    '8x_scope': 12
  },
  gyroscope: {
    tpp_no_scope: 95,
    fpp_no_scope: 95,
    red_dot: 55,
    '2x_scope': 35,
    '3x_scope': 25,
    '4x_scope': 20,
    '6x_scope': 15,
    '8x_scope': 12
  }
}

// Default game stats structure
export const DEFAULT_GAME_STATS = {
  matches_played: 0,
  wins: 0,
  top_10: 0,
  kills: 0,
  damage: 0,
  survival_time: 0,
  headshot_percentage: 0,
  kd_ratio: 0,
  win_rate: 0,
  avg_damage: 0,
  avg_survival_time: 0,
  season_stats: {}
}
