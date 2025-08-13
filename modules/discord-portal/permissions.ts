import type { DiscordPermissions, MessageType } from './types'

// User role type from existing system
type UserRole = 'admin' | 'manager' | 'coach' | 'player' | 'analyst' | 'pending_player' | 'awaiting_approval'

/**
 * Get Discord Portal permissions for a user role
 */
export function getDiscordPermissions(role: UserRole): DiscordPermissions {
  const rolePermissions: Record<UserRole, DiscordPermissions> = {
    admin: {
      canTriggerManual: true,
      canViewLogs: true,
      canManageWebhooks: true,
      canViewAllTeams: true,
      allowedMessageTypes: [
        'slot_create',
        'slot_update',
        'roster_update',
        'performance_summary',
        'attendance_summary',
        'expense_summary',
        'winnings_summary',
        'daily_summary',
        'weekly_digest',
        'analytics_trend',
        'system_alert',
        'data_cleanup'
      ]
    },
    manager: {
      canTriggerManual: true,
      canViewLogs: true,
      canManageWebhooks: true, // Only for their team
      canViewAllTeams: false,
      allowedMessageTypes: [
        'slot_create',
        'slot_update',
        'roster_update',
        'performance_summary',
        'attendance_summary',
        'expense_summary',
        'analytics_trend',
        'daily_summary',
        'weekly_digest'
      ]
    },
    coach: {
      canTriggerManual: true,
      canViewLogs: true,
      canManageWebhooks: false,
      canViewAllTeams: false,
      allowedMessageTypes: [
        'performance_summary',
        'attendance_summary',
        'daily_summary'
      ]
    },
    analyst: {
      canTriggerManual: true,
      canViewLogs: true,
      canManageWebhooks: false,
      canViewAllTeams: false,
      allowedMessageTypes: [
        'performance_summary',
        'analytics_trend'
      ]
    },
    player: {
      canTriggerManual: false,
      canViewLogs: false,
      canManageWebhooks: false,
      canViewAllTeams: false,
      allowedMessageTypes: []
    },
    pending_player: {
      canTriggerManual: false,
      canViewLogs: false,
      canManageWebhooks: false,
      canViewAllTeams: false,
      allowedMessageTypes: []
    },
    awaiting_approval: {
      canTriggerManual: false,
      canViewLogs: false,
      canManageWebhooks: false,
      canViewAllTeams: false,
      allowedMessageTypes: []
    }
  }

  return rolePermissions[role] || rolePermissions.player
}

/**
 * Check if a user can trigger a specific message type
 */
export function canTriggerMessageType(role: UserRole, messageType: MessageType): boolean {
  const permissions = getDiscordPermissions(role)
  return permissions.canTriggerManual && permissions.allowedMessageTypes.includes(messageType)
}

/**
 * Check if a user can view Discord logs
 */
export function canViewLogs(role: UserRole, targetTeamId?: string, userTeamId?: string): boolean {
  const permissions = getDiscordPermissions(role)
  
  if (!permissions.canViewLogs) {
    return false
  }

  // Admin can view all logs
  if (permissions.canViewAllTeams) {
    return true
  }

  // Others can only view logs for their own team
  if (targetTeamId && userTeamId) {
    return targetTeamId === userTeamId
  }

  // If no specific team is being queried, allow (will be filtered by team in the query)
  return true
}

/**
 * Check if a user can manage webhooks
 */
export function canManageWebhooks(role: UserRole, targetTeamId?: string, userTeamId?: string): boolean {
  const permissions = getDiscordPermissions(role)
  
  if (!permissions.canManageWebhooks) {
    return false
  }

  // Admin can manage all webhooks
  if (permissions.canViewAllTeams) {
    return true
  }

  // Managers can only manage their team's webhooks
  if (targetTeamId && userTeamId) {
    return targetTeamId === userTeamId
  }

  return false
}

/**
 * Get allowed webhook types for a user role
 */
export function getAllowedWebhookTypes(role: UserRole): ('team' | 'admin' | 'global')[] {
  if (role === 'admin') {
    return ['team', 'admin', 'global']
  }
  
  if (role === 'manager') {
    return ['team']
  }

  return []
}

/**
 * Check if a role can access the Discord Portal module at all
 */
export function canAccessDiscordPortal(role: UserRole): boolean {
  const excludedRoles: UserRole[] = ['player', 'pending_player', 'awaiting_approval']
  return !excludedRoles.includes(role)
}

/**
 * Get message type categories for UI organization
 */
export function getMessageTypeCategories(): Record<string, MessageType[]> {
  return {
    'Team Management': [
      'slot_create',
      'slot_update',
      'roster_update'
    ],
    'Performance & Analytics': [
      'performance_summary',
      'analytics_trend'
    ],
    'Operations': [
      'attendance_summary',
      'expense_summary',
      'winnings_summary'
    ],
    'Reports': [
      'daily_summary',
      'weekly_digest'
    ],
    'System': [
      'system_alert',
      'data_cleanup'
    ]
  }
}

/**
 * Get user-friendly message type names
 */
export function getMessageTypeDisplayName(messageType: MessageType): string {
  const displayNames: Record<MessageType, string> = {
    slot_create: 'Slot Created',
    slot_update: 'Slot Updated',
    roster_update: 'Roster Changed',
    performance_summary: 'Performance Report',
    attendance_summary: 'Attendance Report',
    expense_summary: 'Expense Report',
    winnings_summary: 'Winnings Report',
    daily_summary: 'Daily Summary',
    weekly_digest: 'Weekly Digest',
    analytics_trend: 'Analytics Trend',
    system_alert: 'System Alert',
    data_cleanup: 'Data Cleanup'
  }

  return displayNames[messageType] || messageType
}

/**
 * Get automation setting display names
 */
export function getAutomationDisplayName(key: string): string {
  const displayNames: Record<string, string> = {
    auto_slot_create: 'Auto-notify on Slot Creation',
    auto_roster_update: 'Auto-notify on Roster Changes',
    auto_daily_summary: 'Daily Summary Reports',
    auto_weekly_digest: 'Weekly Digest Reports',
    auto_performance_alerts: 'Performance Alerts',
    auto_attendance_alerts: 'Attendance Alerts',
    auto_data_cleanup: 'Data Cleanup Alerts',
    auto_system_alerts: 'System Alerts',
    auto_admin_notifications: 'Admin Notifications'
  }

  return displayNames[key] || key.replace('auto_', '').replace('_', ' ')
}

/**
 * Get automation setting descriptions
 */
export function getAutomationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    auto_slot_create: 'Automatically send notifications when new gaming slots are created',
    auto_roster_update: 'Automatically notify when players join, leave, or change roles',
    auto_daily_summary: 'Send daily activity summaries at end of day',
    auto_weekly_digest: 'Send weekly performance and activity digests',
    auto_performance_alerts: 'Alert on significant performance changes or achievements',
    auto_attendance_alerts: 'Notify about attendance patterns and issues',
    auto_data_cleanup: 'System notifications about data maintenance activities',
    auto_system_alerts: 'Critical system status and error notifications',
    auto_admin_notifications: 'Administrative notifications for system events'
  }

  return descriptions[key] || 'Automated notification setting'
}