import type { 
  DiscordEmbed,
  MessageType,
  SlotCreateData,
  RosterUpdateData,
  PerformanceSummaryData,
  AttendanceSummaryData,
  ExpenseSummaryData
} from './types'

// Color constants for different message types
const EMBED_COLORS = {
  slot_create: 0x00ff00,      // Green
  slot_update: 0xffaa00,      // Orange
  roster_update: 0x0099ff,    // Blue
  performance_summary: 0xff6600, // Dark Orange
  attendance_summary: 0x9966ff,  // Purple
  expense_summary: 0xff3366,     // Red
  winnings_summary: 0xffd700,    // Gold
  daily_summary: 0x66ccff,       // Light Blue
  weekly_digest: 0x6666ff,       // Dark Blue
  analytics_trend: 0xff9933,     // Amber
  system_alert: 0xff0000,        // Red
  data_cleanup: 0x999999         // Gray
} as const

// Base embed configuration
const getBaseEmbed = (type: MessageType): Pick<DiscordEmbed, 'color' | 'timestamp' | 'footer'> => ({
  color: EMBED_COLORS[type],
  timestamp: new Date().toISOString(),
  footer: {
    text: 'Raptor Esports CRM',
    icon_url: process.env.NEXT_PUBLIC_RAPTOR_LOGO_URL || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=64&h=64&fit=crop&crop=center'
  }
})

/**
 * Format slot creation embed
 */
export function formatSlotCreateEmbed(data: SlotCreateData): DiscordEmbed {
  return {
    ...getBaseEmbed('slot_create'),
    title: '🎮 New Slot Created',
    description: `A new gaming slot has been scheduled for **${data.team_name}**`,
    fields: [
      {
        name: '📅 Date & Time',
        value: `${data.date}\n${data.time_range}`,
        inline: true
      },
      {
        name: '🏢 Organizer',
        value: data.organizer,
        inline: true
      },
      {
        name: '🎯 Matches',
        value: data.match_count.toString(),
        inline: true
      },
      {
        name: '💰 Slot Rate',
        value: data.slot_rate ? `₹${data.slot_rate}` : 'Not specified',
        inline: true
      },
      {
        name: '👤 Created By',
        value: data.created_by_name,
        inline: true
      },
      {
        name: '🆔 Slot ID',
        value: `\`${data.slot_id}\``,
        inline: true
      }
    ]
  }
}

/**
 * Format roster update embed
 */
export function formatRosterUpdateEmbed(data: RosterUpdateData): DiscordEmbed {
  const actionEmoji = {
    added: '➕',
    removed: '➖',
    role_changed: '🔄'
  }

  const actionText = {
    added: 'joined the roster',
    removed: 'left the roster', 
    role_changed: 'changed roles'
  }

  return {
    ...getBaseEmbed('roster_update'),
    title: `${actionEmoji[data.action]} Roster Update`,
    description: `**${data.player_name}** has ${actionText[data.action]} for **${data.team_name}**`,
    fields: [
      {
        name: '👤 Player',
        value: data.player_name,
        inline: true
      },
      {
        name: '🏆 Team',
        value: data.team_name,
        inline: true
      },
      ...(data.in_game_role ? [{
        name: '🎮 In-Game Role',
        value: data.in_game_role,
        inline: true
      }] : []),
      {
        name: '📝 Updated By',
        value: data.updated_by_name,
        inline: true
      }
    ]
  }
}

/**
 * Format performance summary embed
 */
export function formatPerformanceSummaryEmbed(data: PerformanceSummaryData): DiscordEmbed {
  // Build description based on filters applied
  let description = `Performance report for **${data.team_name}**`
  
  const filtersApplied = []
  if (data.filters_applied?.player) {
    filtersApplied.push(`Player: **${data.player_name}**`)
  }
  if (data.filters_applied?.map) {
    filtersApplied.push(`Map: **${data.map_filter}**`)
  }
  
  if (filtersApplied.length > 0) {
    description += `\n🔍 Filters: ${filtersApplied.join(' • ')}`
  }

  const fields = [
    {
      name: '📅 Date Range',
      value: data.date_range,
      inline: false
    },
    {
      name: '🎯 Total Matches',
      value: data.total_matches.toString(),
      inline: true
    },
    {
      name: '🏆 Avg Placement',
      value: data.total_matches > 0 ? `#${data.avg_placement}` : 'No data',
      inline: true
    },
    {
      name: '💀 K/D Ratio',
      value: data.total_matches > 0 ? data.kd_ratio.toString() : 'No data',
      inline: true
    }
  ]

  // Add performance metrics if we have data
  if (data.total_matches > 0) {
    fields.push(
      {
        name: '💥 Average Damage',
        value: data.avg_damage.toLocaleString(),
        inline: true
      },
      {
        name: '⏱️ Avg Survival',
        value: `${Math.round(data.avg_survival)} seconds`,
        inline: true
      },
      {
        name: '⭐ Best Placement',
        value: data.summary_stats.best_placement ? `#${data.summary_stats.best_placement}` : 'No data',
        inline: true
      }
    )

    // Add top performer if available
    if (data.top_performer) {
      fields.push({
        name: '🔥 Top Performer',
        value: `**${data.top_performer.name}**\n${data.top_performer.kills} kills • ${data.top_performer.damage.toLocaleString()} damage`,
        inline: false
      })
    }

    // Add team totals
    fields.push({
      name: '📈 Team Statistics',
      value: [
        `**${data.summary_stats.total_kills}** total kills`,
        `**${data.summary_stats.total_damage.toLocaleString()}** total damage`,
        `**${data.summary_stats.matches_today}** matches today`,
        `**${data.summary_stats.matches_week}** matches this week`
      ].join('\n'),
      inline: true
    })
  }

  return {
    ...getBaseEmbed('performance_summary'),
    title: '📊 Performance Summary',
    description,
    fields
  }
}

/**
 * Format attendance summary embed
 */
export function formatAttendanceSummaryEmbed(data: AttendanceSummaryData): DiscordEmbed {
  const attendanceEmoji = data.attendance_rate >= 80 ? '🟢' : data.attendance_rate >= 60 ? '🟡' : '🔴'
  
  return {
    ...getBaseEmbed('attendance_summary'),
    title: '📋 Attendance Summary',
    description: `Attendance report for **${data.team_name}**`,
    fields: [
      {
        name: '📅 Period',
        value: data.date_range,
        inline: false
      },
      {
        name: '🎯 Total Sessions',
        value: data.total_sessions.toString(),
        inline: true
      },
      {
        name: '✅ Present',
        value: data.present_count.toString(),
        inline: true
      },
      {
        name: '❌ Absent',
        value: data.absent_count.toString(),
        inline: true
      },
      {
        name: `${attendanceEmoji} Attendance Rate`,
        value: `${data.attendance_rate.toFixed(1)}%`,
        inline: false
      },
      {
        name: '🌟 Top Attendees',
        value: data.top_attendees.length > 0 
          ? data.top_attendees.map(a => `**${a.name}** - ${a.percentage.toFixed(1)}%`).join('\n')
          : 'No data available',
        inline: false
      }
    ]
  }
}

/**
 * Format expense summary embed
 */
export function formatExpenseSummaryEmbed(data: ExpenseSummaryData): DiscordEmbed {
  return {
    ...getBaseEmbed('expense_summary'),
    title: '💰 Expense Summary',
    description: `Financial report for **${data.team_name}**`,
    fields: [
      {
        name: '📅 Period',
        value: data.date_range,
        inline: false
      },
      {
        name: '🎮 Total Slots',
        value: data.total_slots.toString(),
        inline: true
      },
      {
        name: '💸 Total Expense',
        value: `₹${data.total_expense.toLocaleString()}`,
        inline: true
      },
      {
        name: '📊 Average Rate',
        value: `₹${data.avg_slot_rate.toLocaleString()}`,
        inline: true
      },
      {
        name: '📈 Highest Single Day',
        value: `**${data.highest_expense_day.date}**\n₹${data.highest_expense_day.amount.toLocaleString()}`,
        inline: false
      }
    ]
  }
}

/**
 * Format daily summary embed
 */
export function formatDailySummaryEmbed(teamName: string, date: string, activities: string[]): DiscordEmbed {
  return {
    ...getBaseEmbed('daily_summary'),
    title: '📅 Daily Summary',
    description: `Daily activity report for **${teamName}**`,
    fields: [
      {
        name: '📅 Date',
        value: date,
        inline: false
      },
      {
        name: '📝 Activities',
        value: activities.length > 0 ? activities.join('\n') : 'No activities recorded',
        inline: false
      }
    ]
  }
}

/**
 * Format weekly digest embed
 */
export function formatWeeklyDigestEmbed(teamName: string, weekRange: string, summary: any): DiscordEmbed {
  return {
    ...getBaseEmbed('weekly_digest'),
    title: '📊 Weekly Digest',
    description: `Weekly summary for **${teamName}**`,
    fields: [
      {
        name: '📅 Week',
        value: weekRange,
        inline: false
      },
      {
        name: '🎮 Slots Played',
        value: summary.totalSlots?.toString() || '0',
        inline: true
      },
      {
        name: '🏆 Matches',
        value: summary.totalMatches?.toString() || '0',
        inline: true
      },
      {
        name: '💰 Expenses',
        value: `₹${summary.totalExpenses?.toLocaleString() || '0'}`,
        inline: true
      },
      {
        name: '📈 Highlights',
        value: summary.highlights || 'No highlights this week',
        inline: false
      }
    ]
  }
}

/**
 * Format system alert embed
 */
export function formatSystemAlertEmbed(title: string, message: string, severity: 'info' | 'warning' | 'error' = 'info'): DiscordEmbed {
  const emoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨'
  }

  return {
    ...getBaseEmbed('system_alert'),
    title: `${emoji[severity]} ${title}`,
    description: message,
    color: severity === 'error' ? 0xff0000 : severity === 'warning' ? 0xffaa00 : 0x0099ff
  }
}

/**
 * Main embed formatter function
 */
export function formatEmbed(messageType: MessageType, data: any): DiscordEmbed {
  switch (messageType) {
    case 'slot_create':
      return formatSlotCreateEmbed(data as SlotCreateData)
    case 'roster_update':
      return formatRosterUpdateEmbed(data as RosterUpdateData)
    case 'performance_summary':
      return formatPerformanceSummaryEmbed(data as PerformanceSummaryData)
    case 'attendance_summary':
      return formatAttendanceSummaryEmbed(data as AttendanceSummaryData)
    case 'expense_summary':
      return formatExpenseSummaryEmbed(data as ExpenseSummaryData)
    case 'daily_summary':
      return formatDailySummaryEmbed(data.teamName, data.date, data.activities)
    case 'weekly_digest':
      return formatWeeklyDigestEmbed(data.teamName, data.weekRange, data.summary)
    case 'system_alert':
      return formatSystemAlertEmbed(data.title, data.message, data.severity)
    default:
      // Fallback for unknown message types
      return {
        ...getBaseEmbed('system_alert'),
        title: '📨 Notification',
        description: data.message || 'No message content available'
      }
  }
}