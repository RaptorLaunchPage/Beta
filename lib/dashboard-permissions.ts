/**
 * Unified Dashboard Permission System
 * Handles all role-based access control for dashboard modules
 */

export type UserRole = 'admin' | 'manager' | 'coach' | 'player' | 'analyst' | 'pending_player' | 'awaiting_approval'

export interface DashboardModule {
  id: string
  title: string
  description: string
  icon: string
  path: string
  allowedRoles: UserRole[]
  requiresTeamData?: boolean
  showInNavigation: boolean
  mobileOrder: number
}

export interface Permission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}

export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Dashboard overview and key metrics',
    icon: 'Home',
    path: '/dashboard',
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    showInNavigation: true,
    mobileOrder: 1
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Performance analytics and reports',
    icon: 'BarChart3',
    path: '/dashboard/analytics',
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    showInNavigation: true,
    mobileOrder: 2
  },
  {
    id: 'performance',
    title: 'Performance',
    description: 'Performance tracking and entry',
    icon: 'Target',
    path: '/dashboard/performance',
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    showInNavigation: true,
    mobileOrder: 3
  },
  {
    id: 'teams',
    title: 'Team Management',
    description: 'Team management and roster',
    icon: 'Users',
    path: '/dashboard/team-management/teams',
    allowedRoles: ['admin', 'manager', 'coach'],
    showInNavigation: true,
    mobileOrder: 6
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Financial management and tracking',
    icon: 'IndianRupee',
    path: '/dashboard/finance',
    allowedRoles: ['admin', 'manager'],
    showInNavigation: true,
    mobileOrder: 7
  },
  {
    id: 'users',
    title: 'User Management',
    description: 'User management and roles',
    icon: 'UserCheck',
    path: '/dashboard/user-management',
    allowedRoles: ['admin'],
    showInNavigation: true,
    mobileOrder: 8
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Track practice and match attendance',
    icon: 'CalendarCheck',
    path: '/dashboard/attendance',
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    showInNavigation: true,
    mobileOrder: 4
  },
  {
    id: 'tryouts',
    title: 'Tryouts',
    description: 'Manage team tryouts and player recruitment',
    icon: 'UserPlus',
    path: '/dashboard/tryouts',
    allowedRoles: ['admin', 'manager', 'coach'],
    showInNavigation: true,
    mobileOrder: 5
  },
  {
    id: 'discord-portal',
    title: 'Discord Portal',
    description: 'Discord notifications and webhook management',
    icon: 'MessageSquare',
    path: '/dashboard/discord-portal',
    allowedRoles: ['admin'],
    showInNavigation: true,
    mobileOrder: 9
  },
  {
    id: 'admin-settings',
    title: 'System Settings',
    description: 'System configuration and agreement enforcement',
    icon: 'Settings',
    path: '/dashboard/admin/settings',
    allowedRoles: ['admin'],
    showInNavigation: true,
    mobileOrder: 10
  },
  {
    id: 'agreement-management',
    title: 'Agreement Management',
    description: 'Create and edit user agreements',
    icon: 'FileText',
    path: '/dashboard/admin/agreements',
    allowedRoles: ['admin'],
    showInNavigation: true,
    mobileOrder: 11
  },
  {
    id: 'media',
    title: 'Media',
    description: 'Upload and manage media assets',
    icon: 'FileText',
    path: '/dashboard/media',
    allowedRoles: ['admin'],
    showInNavigation: true,
    mobileOrder: 12
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Personal profile and settings',
    icon: 'User',
    path: '/dashboard/profile',
    allowedRoles: ['admin', 'manager', 'coach', 'player', 'analyst'],
    showInNavigation: false,
    mobileOrder: 99
  }
]

export class DashboardPermissions {
  /**
   * Check if user can access a specific module
   */
  static canAccessModule(userRole: UserRole | undefined, moduleId: string): boolean {
    if (!userRole) return false
    
    const module = DASHBOARD_MODULES.find(m => m.id === moduleId)
    if (!module) return false
    
    return module.allowedRoles.includes(userRole)
  }

  /**
   * Get all modules accessible to a user role
   */
  static getAccessibleModules(userRole: UserRole | undefined): DashboardModule[] {
    if (!userRole) return []
    
    return DASHBOARD_MODULES
      .filter(module => module.allowedRoles.includes(userRole))
      .sort((a, b) => a.mobileOrder - b.mobileOrder)
  }

  /**
   * Get navigation modules for sidebar/mobile nav
   */
  static getNavigationModules(userRole: UserRole | undefined): DashboardModule[] {
    return this.getAccessibleModules(userRole)
      .filter(module => module.showInNavigation)
  }

  /**
   * Get general permissions for a user role
   */
  static getPermissions(userRole: UserRole | undefined) {
    if (!userRole) {
          return {
      viewDiscordPortal: false,
      manageDiscordPortal: false
    }
    }

    return {
      viewDiscordPortal: ['admin', 'manager', 'coach', 'analyst'].includes(userRole),
      manageDiscordPortal: ['admin', 'manager'].includes(userRole)
    }
  }

  /**
   * Get permissions for data operations
   */
  static getDataPermissions(userRole: UserRole | undefined, dataType: 'users' | 'teams' | 'performance' | 'finance' | 'discord-portal'): Permission {
    if (!userRole) {
      return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false }
    }

    switch (dataType) {
      case 'users':
        return {
          canView: userRole === 'admin',
          canCreate: userRole === 'admin',
          canEdit: userRole === 'admin',
          canDelete: userRole === 'admin',
          canExport: userRole === 'admin'
        }

      case 'teams':
        return {
          canView: ['admin', 'manager', 'coach', 'analyst'].includes(userRole),
          canCreate: ['admin', 'manager'].includes(userRole),
          canEdit: ['admin', 'manager'].includes(userRole),
          canDelete: ['admin', 'manager'].includes(userRole),
          canExport: ['admin', 'manager', 'coach'].includes(userRole)
        }

      case 'performance':
        return {
          canView: ['admin', 'manager', 'coach', 'player', 'analyst'].includes(userRole),
          canCreate: ['admin', 'manager', 'coach', 'player'].includes(userRole),
          canEdit: ['admin', 'manager', 'coach'].includes(userRole),
          canDelete: ['admin', 'manager'].includes(userRole),
          canExport: ['admin', 'manager', 'coach', 'analyst'].includes(userRole)
        }

      case 'finance':
        return {
          canView: ['admin', 'manager'].includes(userRole),
          canCreate: ['admin', 'manager'].includes(userRole),
          canEdit: ['admin', 'manager'].includes(userRole),
          canDelete: userRole === 'admin',
          canExport: ['admin', 'manager'].includes(userRole)
        }

      case 'discord-portal':
        return {
          canView: ['admin', 'manager', 'coach', 'analyst'].includes(userRole),
          canCreate: ['admin', 'manager', 'coach', 'analyst'].includes(userRole),
          canEdit: ['admin', 'manager'].includes(userRole),
          canDelete: ['admin', 'manager'].includes(userRole),
          canExport: ['admin', 'manager'].includes(userRole)
        }

      default:
        return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false }
    }
  }

  /**
   * Check if user should see all data or filtered data
   */
  static shouldSeeAllData(userRole: UserRole | undefined): boolean {
    return ['admin', 'manager'].includes(userRole || '')
  }

  /**
   * Get role display information
   */
  static getRoleInfo(role: UserRole | undefined) {
    const roleMap = {
      admin: { label: 'Administrator', color: 'purple', level: 100 },
      manager: { label: 'Manager', color: 'blue', level: 80 },
      coach: { label: 'Coach', color: 'green', level: 70 },
      analyst: { label: 'Analyst', color: 'indigo', level: 60 },
      player: { label: 'Player', color: 'orange', level: 50 },
      pending_player: { label: 'Pending Approval', color: 'yellow', level: 10 },
      awaiting_approval: { label: 'Awaiting Approval', color: 'yellow', level: 10 }
    }

    return roleMap[role || 'pending_player'] || roleMap.pending_player
  }
}