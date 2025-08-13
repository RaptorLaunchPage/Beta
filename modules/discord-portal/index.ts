// Core Discord Portal functions
export { sendToDiscord, retryFailedMessage, getDiscordLogs } from './sendToDiscord'

// Webhook management
export {
  getTeamWebhooks,
  getAdminWebhooks,
  getAllWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  validateWebhookUrl,
  getTeamAutomationSettings,
  getGlobalAutomationSettings,
  updateAutomationSetting,
  isAutomationEnabled,
  initializeTeamAutomationSettings,
  getWebhookStats
} from './webhookService'

// Embed formatting
export {
  formatEmbed,
  formatSlotCreateEmbed,
  formatRosterUpdateEmbed,
  formatPerformanceSummaryEmbed,
  formatAttendanceSummaryEmbed,
  formatExpenseSummaryEmbed,
  formatDailySummaryEmbed,
  formatWeeklyDigestEmbed,
  formatSystemAlertEmbed
} from './embeds'

// Permissions and role management
export {
  getDiscordPermissions,
  canTriggerMessageType,
  canViewLogs,
  canManageWebhooks,
  getAllowedWebhookTypes,
  canAccessDiscordPortal,
  getMessageTypeCategories,
  getMessageTypeDisplayName,
  getAutomationDisplayName,
  getAutomationDescription
} from './permissions'

// Type exports
export type {
  DiscordWebhook,
  DiscordLog,
  DiscordSetting,
  DiscordWebhookInsert,
  DiscordLogInsert,
  DiscordSettingInsert,
  WebhookType,
  MessageType,
  DiscordMessageStatus,
  AutomationKey,
  DiscordEmbed,
  DiscordEmbedField,
  DiscordWebhookPayload,
  SlotCreateData,
  RosterUpdateData,
  PerformanceSummaryData,
  AttendanceSummaryData,
  ExpenseSummaryData,
  SendMessageResponse,
  WebhookValidationResponse,
  DiscordPermissions,
  TeamAutomationSettings
} from './types'

// Utility functions for common use cases

/**
 * Helper function to send slot creation notification
 */
export async function notifySlotCreated(slotData: {
  slot_id: string
  team_id: string
  team_name: string
  organizer: string
  date: string
  time_range: string
  match_count: number
  slot_rate?: number
  created_by_name: string
  created_by_id: string
}) {
  const { sendToDiscord } = await import('./sendToDiscord')
  
  return sendToDiscord({
    messageType: 'slot_create',
    data: {
      slot_id: slotData.slot_id,
      team_name: slotData.team_name,
      organizer: slotData.organizer,
      date: slotData.date,
      time_range: slotData.time_range,
      match_count: slotData.match_count,
      slot_rate: slotData.slot_rate,
      created_by_name: slotData.created_by_name
    },
    teamId: slotData.team_id,
    triggeredBy: slotData.created_by_id,
    isAutomatic: true,
    webhookTypes: ['team', 'admin']
  })
}

/**
 * Helper function to send roster update notification
 */
export async function notifyRosterUpdate(rosterData: {
  team_id: string
  team_name: string
  player_name: string
  action: 'added' | 'removed' | 'role_changed'
  in_game_role?: string
  updated_by_name: string
  updated_by_id: string
}) {
  const { sendToDiscord } = await import('./sendToDiscord')
  
  return sendToDiscord({
    messageType: 'roster_update',
    data: {
      team_name: rosterData.team_name,
      player_name: rosterData.player_name,
      action: rosterData.action,
      in_game_role: rosterData.in_game_role,
      updated_by_name: rosterData.updated_by_name
    },
    teamId: rosterData.team_id,
    triggeredBy: rosterData.updated_by_id,
    isAutomatic: true,
    webhookTypes: ['team', 'admin']
  })
}

/**
 * Helper function to send system alert
 */
export async function sendSystemAlert(alertData: {
  title: string
  message: string
  severity?: 'info' | 'warning' | 'error'
  triggered_by_id?: string
}) {
  const { sendToDiscord } = await import('./sendToDiscord')
  
  return sendToDiscord({
    messageType: 'system_alert',
    data: {
      title: alertData.title,
      message: alertData.message,
      severity: alertData.severity || 'info'
    },
    triggeredBy: alertData.triggered_by_id,
    isAutomatic: true,
    webhookTypes: ['admin', 'global']
  })
}