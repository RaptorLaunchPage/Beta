import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import type { 
  MessageType, 
  DiscordWebhookPayload, 
  SendMessageResponse,
  DiscordLogInsert,
  AutomationKey
} from './types'
import { formatEmbed } from './embeds'
import { getTeamWebhooks, getAdminWebhooks, getWebhookById, isAutomationEnabled } from './webhookService'

// Use the same Supabase client configuration as the main app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Helper function to ensure supabase is available
 */
function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not available - missing environment variables')
  }
  return supabase
}

/**
 * Send a message to Discord via webhook
 */
export async function sendToDiscord({
  messageType,
  data,
  teamId,
  triggeredBy,
  isAutomatic = false,
  webhookTypes = ['team'],
  webhookId
}: {
  messageType: MessageType
  data: any
  teamId?: string
  triggeredBy?: string
  isAutomatic?: boolean
  webhookTypes?: ('team' | 'admin' | 'global')[]
  webhookId?: string
}): Promise<SendMessageResponse> {
  try {
    // If this is an automatic message, check if automation is enabled
    if (isAutomatic && teamId) {
      const automationKey = getAutomationKeyForMessageType(messageType)
      if (automationKey) {
        const isEnabled = await isAutomationEnabled(automationKey, teamId)
        if (!isEnabled) {
          return { 
            success: false, 
            error: 'Automation is disabled for this message type' 
          }
        }
      }
    }

    // Get appropriate webhooks
    let webhooks
    if (webhookId) {
      // Use specific webhook if provided
      const specificWebhook = await getWebhookById(webhookId)
      if (!specificWebhook) {
        return { 
          success: false, 
          error: 'Selected webhook not found or inactive' 
        }
      }
      webhooks = [specificWebhook]
    } else {
      // Use the existing logic to get webhooks by type
      webhooks = await getWebhooksForMessage(teamId, webhookTypes)
      
      if (webhooks.length === 0) {
        return { 
          success: false, 
          error: `No active webhooks found for ${webhookTypes.join(', ')} notifications` 
        }
      }
    }

    // Format the embed
    const embed = formatEmbed(messageType, data)
    
    // Create the Discord payload
    const payload: DiscordWebhookPayload = {
      embeds: [embed],
      username: process.env.NEXT_PUBLIC_DISCORD_BOT_NAME || 'Raptor Esports CRM',
      avatar_url: process.env.NEXT_PUBLIC_DISCORD_BOT_AVATAR_URL || undefined as any
    }

    // Send to all applicable webhooks
    const results = await Promise.allSettled(
      webhooks.map(webhook => sendWebhookMessage(webhook.hook_url, payload))
    )

    // Log each attempt
    const logEntries: DiscordLogInsert[] = []
    let successCount = 0
    let lastError = ''

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const webhook = webhooks[i]
      
      if (result.status === 'fulfilled') {
        const response = result.value
        successCount++
        
        logEntries.push({
          team_id: teamId || null,
          webhook_id: webhook.id,
          message_type: messageType,
          status: 'success',
          payload: payload as any, // JSON serializable
          response_code: response.status,
          response_body: response.statusText,
          triggered_by: triggeredBy || null,
          retry_count: 0
        })
      } else {
        lastError = result.reason?.message || 'Unknown error'
        
        logEntries.push({
          team_id: teamId || null,
          webhook_id: webhook.id,
          message_type: messageType,
          status: 'failed',
          payload: payload as any,
          response_code: null,
          error_message: lastError,
          triggered_by: triggeredBy || null,
          retry_count: 0
        })
      }
    }

    // Insert logs to database
    const { data: logs, error: logError } = await ensureSupabase()
      .from('communication_logs')
      .insert(logEntries)
      .select()

    if (logError) {
      console.error('Error logging communication attempts:', logError)
    }

    // Return success if at least one webhook succeeded
    if (successCount > 0) {
      return {
        success: true,
        log_id: logs?.[0]?.id
      }
    } else {
      return {
        success: false,
        error: lastError || 'All webhook deliveries failed'
      }
    }

  } catch (error) {
    console.error('Error in sendToDiscord:', error)
    
    // Log the error
    await ensureSupabase()
      .from('communication_logs')
      .insert({
        team_id: teamId || null,
        webhook_id: null,
        message_type: messageType,
        status: 'failed',
        payload: { error: 'System error before webhook delivery' } as any,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        triggered_by: triggeredBy || null,
        retry_count: 0
      })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Send a message to a single webhook URL
 */
async function sendWebhookMessage(webhookUrl: string, payload: DiscordWebhookPayload): Promise<Response> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Raptor-Esports-CRM/1.0'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`)
  }

  return response
}

/**
 * Get webhooks based on message type and target
 */
async function getWebhooksForMessage(
  teamId?: string, 
  types: ('team' | 'admin' | 'global')[] = ['team']
): Promise<Array<{ id: string; hook_url: string }>> {
  const webhooks = []

  // Get team webhooks if requested and teamId provided
  if (types.includes('team') && teamId) {
    const teamWebhooks = await getTeamWebhooks(teamId)
    webhooks.push(...teamWebhooks)
  }

  // Get admin/global webhooks if requested
  if (types.includes('admin') || types.includes('global')) {
    const adminWebhooks = await getAdminWebhooks()
    webhooks.push(...adminWebhooks.filter(w => types.includes(w.type as any)))
  }

  return webhooks
}

/**
 * Map message types to automation keys
 */
function getAutomationKeyForMessageType(messageType: MessageType): AutomationKey | null {
  const mapping: Record<MessageType, AutomationKey | null> = {
    slot_create: 'auto_slot_create',
    slot_update: 'auto_slot_create', // Use same setting
    roster_update: 'auto_roster_update',
    performance_summary: 'auto_performance_alerts',
    attendance_summary: 'auto_attendance_alerts',
    daily_summary: 'auto_daily_summary',
    weekly_digest: 'auto_weekly_digest',
    expense_summary: null, // Manual only
    winnings_summary: null, // Manual only
    analytics_trend: null, // Manual only
    system_alert: 'auto_system_alerts',
    data_cleanup: 'auto_data_cleanup'
  }

  return mapping[messageType]
}

/**
 * Retry failed messages
 */
export async function retryFailedMessage(logId: string): Promise<SendMessageResponse> {
  try {
    // Get the failed log entry
    const { data: log, error } = await ensureSupabase()
      .from('communication_logs')
      .select('*')
      .eq('id', logId)
      .eq('status', 'failed')
      .single()

    if (error || !log) {
      return { success: false, error: 'Failed log entry not found' }
    }

    // Get the webhook
    if (!log.webhook_id) {
      return { success: false, error: 'No webhook associated with this log entry' }
    }

    const { data: webhook } = await ensureSupabase()
      .from('discord_webhooks')
      .select('hook_url')
      .eq('id', log.webhook_id)
      .single()

    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    // Retry the message
    const response = await sendWebhookMessage(webhook.hook_url, log.payload as DiscordWebhookPayload)

    // Update the log entry
    await ensureSupabase()
      .from('communication_logs')
      .update({
        status: 'success',
        response_code: response.status,
        response_body: response.statusText,
        retry_count: (log.retry_count || 0) + 1,
        timestamp: new Date().toISOString()
      })
      .eq('id', logId)

    return { success: true, log_id: logId }

  } catch (error) {
    // Update the log entry with new failure
    await ensureSupabase()
      .from('communication_logs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Retry failed',
        retry_count: (await ensureSupabase()
          .from('communication_logs')
          .select('retry_count')
          .eq('id', logId)
          .single()
        ).data?.retry_count || 0 + 1
      })
      .eq('id', logId)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Retry failed'
    }
  }
}

/**
 * Get Discord logs with filtering
 */
export async function getDiscordLogs({
  teamId,
  messageType,
  status,
  limit = 50,
  offset = 0
}: {
  teamId?: string
  messageType?: MessageType
  status?: string
  limit?: number
  offset?: number
} = {}) {
  let query = ensureSupabase()
    .from('communication_logs')
    .select(`
      *,
      discord_webhooks:webhook_id (
        type
      ),
      teams:team_id (
        name
      ),
      users:triggered_by (
        name,
        email
      )
    `)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  if (teamId) {
    query = query.eq('team_id', teamId)
  }

  if (messageType) {
    query = query.eq('message_type', messageType)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching communication logs:', error)
    return { logs: [], error: error.message }
  }

  return { logs: data || [], error: null }
}