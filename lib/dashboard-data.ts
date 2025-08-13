/**
 * Unified Dashboard Data Access Layer
 * Handles all data fetching with consistent role-based filtering
 */

import { supabase } from './supabase'
import { DashboardPermissions, type UserRole } from './dashboard-permissions'

export interface DashboardDataOptions {
  role: UserRole
  userId: string
  teamId?: string
  timeframe?: string
  includeFinance?: boolean
  includeUsers?: boolean
  limit?: number
  offset?: number
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export class DashboardData {
  private options: DashboardDataOptions

  constructor(options: DashboardDataOptions) {
    this.options = options
  }

  async getOverviewStats() {
    const { timeframe = '30' } = this.options
    try {
      const token = await getToken()
      const res = await fetch(`/api/dashboard/overview?timeframe=${timeframe}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch overview')
      const payload = await res.json()
      return payload.stats
    } catch (e) {
      return {
        totalMatches: 0,
        totalKills: 0,
        avgDamage: 0,
        avgSurvival: 0,
        kdRatio: 0,
        totalExpense: 0,
        totalProfitLoss: 0,
        activeTeams: 0,
        activePlayers: 0,
        todayMatches: 0,
        weekMatches: 0,
        avgPlacement: 0
      }
    }
  }

  async getTopPerformers() {
    const { timeframe = '30' } = this.options
    try {
      const token = await getToken()
      const perfRes = await fetch(`/api/performances?timeframe=${timeframe}`, { headers: { Authorization: `Bearer ${token}` } })
      const performances = perfRes.ok ? await perfRes.json() : []
      const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const usersRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      const teams = teamsRes.ok ? await teamsRes.json() : []
      const users = usersRes.ok ? await usersRes.json() : []

      if (!Array.isArray(performances) || performances.length === 0) return { topTeam: null, topPlayer: null, highestKills: null, highestDamage: null }

      const teamStats = new Map<any, any>()
      performances.forEach((perf: any) => {
        const teamId = perf.team_id
        const teamName = teams.find((t: any) => t.id === teamId)?.name
        if (!teamId) return
        if (!teamStats.has(teamId)) teamStats.set(teamId, { name: teamName || 'Unknown Team', matches: 0, kills: 0, damage: 0, wins: 0, placements: [] as number[] })
        const stats = teamStats.get(teamId)
        stats.matches += 1
        stats.kills += perf.kills || 0
        stats.damage += perf.damage || 0
        stats.placements.push(perf.placement || 0)
        if (perf.placement === 1) stats.wins += 1
      })
      let topTeam = null
      let bestScore = 0
      for (const [teamId, stats] of teamStats) {
        const avgDamage = stats.damage / stats.matches
        const kdRatio = stats.kills / Math.max(stats.matches, 1)
        const winRate = (stats.wins / stats.matches) * 100
        const score = (avgDamage * 0.3) + (kdRatio * 20) + (winRate * 2)
        if (score > bestScore) {
          bestScore = score
          topTeam = { id: teamId, name: stats.name, matches: stats.matches, kills: stats.kills, avgDamage, kdRatio, winRate }
        }
      }

      const playerStats = new Map<any, any>()
      performances.forEach((perf: any) => {
        const playerId = perf.player_id
        if (!playerId) return
        if (!playerStats.has(playerId)) playerStats.set(playerId, { id: playerId, name: null as string | null, team: null as string | null, matches: 0, kills: 0, damage: 0, wins: 0 })
        const stats = playerStats.get(playerId)
        stats.matches += 1
        stats.kills += perf.kills || 0
        stats.damage += perf.damage || 0
        if (perf.placement === 1) stats.wins += 1
      })
      const topPlayer = Array.from(playerStats.entries()).map(([playerId, stats]) => {
        const user = users.find((u: any) => u.id === playerId)
        return { id: playerId, name: user?.name || user?.email || 'Unknown Player', team: teams.find((t: any) => t.id === user?.team_id)?.name, value: Math.round((stats.damage / Math.max(stats.matches, 1)) * 0.3 + (stats.kills / Math.max(stats.matches, 1)) * 20), metric: 'Score' }
      }).sort((a, b) => b.value - a.value)[0] || null

      return { topTeam, topPlayer, highestKills: null, highestDamage: null }
    } catch (e) {
      return { topTeam: null, topPlayer: null, highestKills: null, highestDamage: null }
    }
  }

  async getRecentPerformances(limit = 10) {
    try {
      const token = await getToken()
      const res = await fetch(`/api/performances?timeframe=30`, { headers: { Authorization: `Bearer ${token}` } })
      const data = res.ok ? await res.json() : []
      return Array.isArray(data) ? data.slice(0, limit) : []
    } catch (e) {
      return []
    }
  }

  static async getUsers(options: DashboardDataOptions) {
    try {
      const token = await getToken()
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      const data = res.ok ? await res.json() : []
      return { data: Array.isArray(data) ? data.slice(0, options.limit || data.length) : [], error: null }
    } catch (e: any) {
      return { data: [], error: e.message }
    }
  }

  static async getTeams(options: DashboardDataOptions) {
    try {
      const token = await getToken()
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const data = res.ok ? await res.json() : []
      return { data: Array.isArray(data) ? data.slice(0, options.limit || data.length) : [], error: null }
    } catch (e: any) {
      return { data: [], error: e.message }
    }
  }

  static async getPerformances(options: DashboardDataOptions) {
    try {
      const params = new URLSearchParams()
      if (options.teamId) params.set('teamId', options.teamId)
      if (options.timeframe) params.set('timeframe', options.timeframe)
      const token = await getToken()
      const res = await fetch(`/api/performances?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = res.ok ? await res.json() : []
      return { data: Array.isArray(data) ? data.slice(0, options.limit || data.length) : [], error: null }
    } catch (e: any) {
      return { data: [], error: e.message }
    }
  }

  static async getOverviewStats(options: DashboardDataOptions) {
    const { timeframe = '30' } = options
    try {
      const token = await getToken()
      const res = await fetch(`/api/dashboard/overview?timeframe=${timeframe}`, { headers: { Authorization: `Bearer ${token}` } })
      const payload = res.ok ? await res.json() : null
      if (!payload) throw new Error('Failed to fetch overview')
      return { data: payload.stats, error: null }
    } catch (e: any) {
      return { data: null, error: e.message }
    }
  }

  static async exportData(dataType: 'performance' | 'teams' | 'users', options: DashboardDataOptions, format: 'csv' | 'json' = 'csv') {
    try {
      let data: any[] = []
      switch (dataType) {
        case 'performance':
          const perfRes = await this.getPerformances(options)
          data = perfRes.data
          break
        case 'teams':
          const teamsRes = await this.getTeams(options)
          data = teamsRes.data
          break
        case 'users':
          const usersRes = await this.getUsers(options)
          data = usersRes.data
          break
      }
      if (format === 'csv') {
        return this.convertToCSV(data)
      } else {
        return JSON.stringify(data, null, 2)
      }
    } catch (error: any) {
      throw new Error(`Export failed: ${error.message}`)
    }
  }

  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => headers.map(header => {
      const value = row[header]
      if (typeof value === 'object' && value !== null) return JSON.stringify(value).replace(/"/g, '""')
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(','))
    return [csvHeaders, ...csvRows].join('\n')
  }
}