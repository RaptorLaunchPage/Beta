import type { Database } from "./supabase"

// Role type from database
export type UserRole = Database['public']['Tables']['users']['Row']['role']

// Role configuration with levels and permissions
export const ROLE_CONFIG = {
  admin: {
    level: 100,
    name: 'Admin',
    description: 'Full access to all modules',
    permissions: {
      // User Management
      viewAllUsers: true,
      updateUserRoles: true,
      deleteUsers: true,
      createUsers: true,
      
      // Team Management
      viewAllTeams: true,
      createTeams: true,
      updateTeams: true,
      deleteTeams: true,
      assignCoaches: true,
      
      // Performance & Analytics
      viewAllPerformance: true,
      createPerformance: true,
      updatePerformance: true,
      deletePerformance: true,
      
      // Scrims & Matches
      viewAllScrims: true,
      createScrims: true,
      updateScrims: true,
      deleteScrims: true,
      
      // Finances
      viewAllFinances: true,
      createFinances: true,
      updateFinances: true,
      deleteFinances: true,
      
      // System
      viewAdminPanel: true,
      viewReports: true,
      viewAnalytics: true,
      systemConfiguration: true
    }
  },
  manager: {
    level: 80,
    name: 'Manager',
    description: 'Team operations, scrim entries, attendance oversight',
    permissions: {
      // User Management
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      
      // Team Management
      viewAllTeams: true,
      createTeams: true,
      updateTeams: true,
      deleteTeams: false,
      assignCoaches: true,
      
      // Performance & Analytics
      viewAllPerformance: true,
      createPerformance: true,
      updatePerformance: true,
      deletePerformance: false,
      
      // Scrims & Matches
      viewAllScrims: true,
      createScrims: true,
      updateScrims: true,
      deleteScrims: false,
      
      // Finances
      viewAllFinances: true,
      createFinances: true,
      updateFinances: true,
      deleteFinances: false,
      
      // System
      viewAdminPanel: false,
      viewReports: true,
      viewAnalytics: true,
      systemConfiguration: false
    }
  },
  coach: {
    level: 70,
    name: 'Coach',
    description: 'Team and player stats, attendance reports, performance tracking',
    permissions: {
      // User Management
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      
      // Team Management
      viewAllTeams: false, // Only assigned teams
      createTeams: false,
      updateTeams: false, // Only assigned teams
      deleteTeams: false,
      assignCoaches: false,
      
      // Performance & Analytics
      viewAllPerformance: false, // Only assigned teams
      createPerformance: true,
      updatePerformance: true,
      deletePerformance: false,
      
      // Scrims & Matches
      viewAllScrims: false, // Only assigned teams
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      
      // Finances
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      
      // System
      viewAdminPanel: false,
      viewReports: true, // Only assigned teams
      viewAnalytics: true, // Only assigned teams
      systemConfiguration: false
    }
  },
  analyst: {
    level: 60,
    name: 'Analyst',
    description: 'Read-only access to scrim results, performance data, reports',
    permissions: {
      // User Management
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      
      // Team Management
      viewAllTeams: false, // Only assigned teams
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      
      // Performance & Analytics
      viewAllPerformance: false, // Only assigned teams
      createPerformance: false,
      updatePerformance: false,
      deletePerformance: false,
      
      // Scrims & Matches
      viewAllScrims: false, // Only assigned teams
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      
      // Finances
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      
      // System
      viewAdminPanel: false,
      viewReports: true, // Only assigned teams
      viewAnalytics: true, // Only assigned teams
      systemConfiguration: false
    }
  },
  player: {
    level: 50,
    name: 'Player',
    description: 'Limited access — view only their own data',
    permissions: {
      // User Management
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      
      // Team Management
      viewAllTeams: false, // Only own team
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      
      // Performance & Analytics
      viewAllPerformance: false, // Only own performance
      createPerformance: true, // Players can submit their own performance
      updatePerformance: false,
      deletePerformance: false,
      
      // Scrims & Matches
      viewAllScrims: false, // Only own team scrims
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      
      // Finances
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      
      // System
      viewAdminPanel: false,
      viewReports: true, // Can view own performance reports
      viewAnalytics: true, // Can view own analytics
      systemConfiguration: false
    }
  },
  pending: {
    level: 10,
    name: 'Pending Approval',
    description: 'Temporary role, minimal access for onboarding and evaluation',
    permissions: {
      // User Management
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      
      // Team Management
      viewAllTeams: false,
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      
      // Performance & Analytics
      viewAllPerformance: false,
      createPerformance: false,
      updatePerformance: false,
      deletePerformance: false,
      
      // Scrims & Matches
      viewAllScrims: false,
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      
      // Finances
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      
      // System
      viewAdminPanel: false,
      viewReports: false,
      viewAnalytics: false,
      systemConfiguration: false
    }
  },
  pending_player: {
    level: 10,
    name: 'Pending Approval',
    description: 'Temporary role, minimal access for onboarding and evaluation',
    permissions: {
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      viewAllTeams: false,
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      viewAllPerformance: false,
      createPerformance: false,
      updatePerformance: false,
      deletePerformance: false,
      viewAllScrims: false,
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      viewAdminPanel: false,
      viewReports: false,
      viewAnalytics: false,
      systemConfiguration: false
    }
  },
  awaiting_approval: {
    level: 10,
    name: 'Awaiting Approval',
    description: 'Temporary role, minimal access for onboarding and evaluation',
    permissions: {
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      viewAllTeams: false,
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      viewAllPerformance: false,
      createPerformance: false,
      updatePerformance: false,
      deletePerformance: false,
      viewAllScrims: false,
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      viewAdminPanel: false,
      viewReports: false,
      viewAnalytics: false,
      systemConfiguration: false
    }
  },
  tryout: {
    level: 8,
    name: 'Tryout',
    description: 'User participating in tryouts',
    permissions: {
      viewAllUsers: false,
      updateUserRoles: false,
      deleteUsers: false,
      createUsers: false,
      viewAllTeams: false,
      createTeams: false,
      updateTeams: false,
      deleteTeams: false,
      assignCoaches: false,
      viewAllPerformance: false,
      createPerformance: false,
      updatePerformance: false,
      deletePerformance: false,
      viewAllScrims: false,
      createScrims: false,
      updateScrims: false,
      deleteScrims: false,
      viewAllFinances: false,
      createFinances: false,
      updateFinances: false,
      deleteFinances: false,
      viewAdminPanel: false,
      viewReports: false,
      viewAnalytics: false,
      systemConfiguration: false
    }
  }
} as const

// Access control utility functions
export class RoleAccess {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: UserRole, permission: keyof typeof ROLE_CONFIG.admin.permissions): boolean {
    const roleConfig = ROLE_CONFIG[role]
    return roleConfig?.permissions[permission] || false
  }

  /**
   * Check if a role has sufficient level for an action
   */
  static hasMinimumLevel(role: UserRole, minimumLevel: number): boolean {
    const roleConfig = ROLE_CONFIG[role]
    return (roleConfig?.level || 0) >= minimumLevel
  }

  /**
   * Check if roleA has higher level than roleB
   */
  static hasHigherLevel(roleA: UserRole, roleB: UserRole): boolean {
    const levelA = ROLE_CONFIG[roleA]?.level || 0
    const levelB = ROLE_CONFIG[roleB]?.level || 0
    return levelA > levelB
  }

  /**
   * Get available modules for a role
   */
  static getAvailableModules(role: UserRole): string[] {
    const permissions = ROLE_CONFIG[role]?.permissions
    if (!permissions) return []

    const modules: string[] = []

    // Dashboard always available
    modules.push('dashboard')

    // User Management
    if (permissions.viewAllUsers || permissions.updateUserRoles) {
      modules.push('user-management')
    }

    // Team Management
    if (permissions.viewAllTeams || permissions.createTeams) {
      modules.push('team-management')
    }

    // Performance - players can access even if they can't view all performance
    if (permissions.viewAllPerformance || permissions.createPerformance || role === 'player') {
      modules.push('performance')
    }

    // Reports and Analytics - players can access their own data
    if (permissions.viewReports || permissions.viewAnalytics || role === 'player') {
      modules.push('reports')
      modules.push('analytics')
    }

    // Profile always available
    modules.push('profile')

    return modules
  }

  /**
   * Get role display information
   */
  static getRoleInfo(role: UserRole) {
    return {
      name: ROLE_CONFIG[role]?.name || 'Unknown',
      level: ROLE_CONFIG[role]?.level || 0,
      description: ROLE_CONFIG[role]?.description || 'No description'
    }
  }

  /**
   * Check if user can update another user's role
   */
  static canUpdateUserRole(currentUserRole: UserRole, targetUserRole: UserRole, newRole: UserRole): boolean {
    // Only admins can update roles
    if (!this.hasPermission(currentUserRole, 'updateUserRoles')) {
      return false
    }

    // Admin can update any role
    if (currentUserRole === 'admin') {
      return true
    }

    // Non-admins cannot assign admin role
    if (newRole === 'admin') {
      return false
    }

    // User must have higher level than target
    return this.hasHigherLevel(currentUserRole, targetUserRole)
  }

  /**
   * Get safe default role for new users
   */
  static getDefaultRole(): UserRole {
    return 'pending_player'
  }

  /**
   * Get all available roles (for dropdowns, etc.)
   */
  static getAllRoles(): UserRole[] {
    return Object.keys(ROLE_CONFIG) as UserRole[]
  }

  /**
   * Get roles that can be assigned by current user
   */
  static getAssignableRoles(currentUserRole: UserRole): UserRole[] {
    if (currentUserRole === 'admin') {
      return this.getAllRoles()
    }

    // Non-admins can only assign roles lower than themselves
    const currentLevel = ROLE_CONFIG[currentUserRole]?.level || 0
    return this.getAllRoles().filter(role => {
      const roleLevel = ROLE_CONFIG[role]?.level || 0
      return roleLevel < currentLevel
    })
  }

  /**
   * Validate role assignment
   */
  static validateRoleAssignment(currentUserRole: UserRole, targetRole: UserRole): {
    valid: boolean
    error?: string
  } {
    if (!this.hasPermission(currentUserRole, 'updateUserRoles')) {
      return {
        valid: false,
        error: 'You do not have permission to update user roles'
      }
    }

    if (targetRole === 'admin' && currentUserRole !== 'admin') {
      return {
        valid: false,
        error: 'Only admins can assign admin role'
      }
    }

    if (!this.getAllRoles().includes(targetRole)) {
      return {
        valid: false,
        error: 'Invalid role specified'
      }
    }

    return { valid: true }
  }
}

// Route access control middleware
export const routeAccess = {
  '/dashboard/user-management': (role: UserRole) => RoleAccess.hasPermission(role, 'viewAllUsers'),
  '/dashboard/team-management': (role: UserRole) => RoleAccess.hasPermission(role, 'viewAllTeams') || role === 'coach',
  '/dashboard/performance': (role: UserRole) => RoleAccess.hasPermission(role, 'viewAllPerformance') || role === 'player' || role === 'coach',
  '/dashboard/performance-report': (role: UserRole) => RoleAccess.hasPermission(role, 'viewAllPerformance') || role === 'player' || role === 'coach',
  '/dashboard/profile': () => true, // Always accessible
  '/dashboard': () => true, // Always accessible
} as const

// Export role constants for easy access
export const ROLES = {
  ADMIN: 'admin' as const,
  MANAGER: 'manager' as const,
  COACH: 'coach' as const,
  ANALYST: 'analyst' as const,
  PLAYER: 'player' as const,
  PENDING: 'pending_player' as const,
  AWAITING_APPROVAL: 'awaiting_approval' as const
}

// Export role levels for easy access
export const ROLE_LEVELS = {
  ADMIN: 100,
  MANAGER: 80,
  COACH: 70,
  ANALYST: 60,
  PLAYER: 50,
  PENDING: 10,
  AWAITING_APPROVAL: 10
} as const