import type { Database } from '@/lib/supabase'

// Base types from database
export type DiscordWebhook = Database['public']['Tables']['discord_webhooks']['Row'] & {
  channel_name?: string // Add channel_name support until DB is updated
}
export type DiscordLog = Database['public']['Tables']['communication_logs']['Row']
export type DiscordSetting = Database['public']['Tables']['communication_settings']['Row']

// Insert types
export type DiscordWebhookInsert = Database['public']['Tables']['discord_webhooks']['Insert'] & {
  channel_name?: string // Add channel_name support until DB is updated
}
export type DiscordLogInsert = Database['public']['Tables']['communication_logs']['Insert']
export type DiscordSettingInsert = Database['public']['Tables']['communication_settings']['Insert']

// Discord webhook types
export type WebhookType = 'team' | 'admin' | 'global'

// Message types for different events
export type MessageType = 
  | 'slot_create'
  | 'slot_update'
  | 'roster_update'
  | 'performance_summary'
  | 'attendance_summary'
  | 'expense_summary'
  | 'winnings_summary'
  | 'daily_summary'
  | 'weekly_digest'
  | 'analytics_trend'
  | 'system_alert'
  | 'data_cleanup'

// Discord message status
export type DiscordMessageStatus = 'success' | 'failed' | 'pending' | 'retry'

// Automation setting keys
export type AutomationKey = 
  | 'auto_slot_create'
  | 'auto_roster_update'
  | 'auto_daily_summary'
  | 'auto_weekly_digest'
  | 'auto_performance_alerts'
  | 'auto_attendance_alerts'
  | 'auto_data_cleanup'
  | 'auto_system_alerts'
  | 'auto_admin_notifications'

// Discord embed structure (follows Discord API)
export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: DiscordEmbedField[]
  footer?: {
    text: string
    icon_url?: string
  }
  timestamp?: string
  thumbnail?: {
    url: string
  }
  author?: {
    name: string
    icon_url?: string
  }
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

// Discord webhook payload
export interface DiscordWebhookPayload {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

// Data structures for different message types
export interface SlotCreateData {
  slot_id: string
  team_name: string
  organizer: string
  date: string
  time_range: string
  match_count: number
  slot_rate?: number
  created_by_name: string
}

export interface RosterUpdateData {
  team_name: string
  player_name: string
  action: 'added' | 'removed' | 'role_changed'
  in_game_role?: string
  updated_by_name: string
}

export interface PerformanceSummaryData {
  team_name: string
  player_name?: string
  map_filter?: string
  date_range: string
  period_filter?: string
  total_matches: number
  avg_placement: number
  avg_damage: number
  avg_survival: number
  kd_ratio: number
  top_performer?: {
    name: string
    kills: number
    damage: number
  } | null
  summary_stats: {
    total_kills: number
    total_damage: number
    best_placement: number | null
    matches_today: number
    matches_week: number
  }
  filters_applied?: {
    team: boolean
    player: boolean
    map: boolean
    time_period: boolean
  }
}

export interface AttendanceSummaryData {
  team_name: string
  date_range: string
  total_sessions: number
  present_count: number
  absent_count: number
  attendance_rate: number
  top_attendees: Array<{
    name: string
    percentage: number
  }>
}

export interface ExpenseSummaryData {
  team_name: string
  date_range: string
  total_slots: number
  total_expense: number
  avg_slot_rate: number
  highest_expense_day: {
    date: string
    amount: number
  }
}

// API response types
export interface SendMessageResponse {
  success: boolean
  log_id?: string
  error?: string
  response_code?: number
}

export interface WebhookValidationResponse {
  valid: boolean
  error?: string
  webhook_info?: {
    guild_name?: string
    channel_name?: string
  }
}

// Role permissions for Discord Portal features
export interface DiscordPermissions {
  canTriggerManual: boolean
  canViewLogs: boolean
  canManageWebhooks: boolean
  canViewAllTeams: boolean
  allowedMessageTypes: MessageType[]
}

// Automation settings by team
export interface TeamAutomationSettings {
  [key: string]: boolean
}