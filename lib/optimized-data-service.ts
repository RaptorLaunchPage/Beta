/**
 * Optimized Data Service for Raptor Esports CRM
 * Implements batching, caching, and query optimization
 */

import { supabase } from './supabase'
import { cacheManager, CacheKeys } from './cache-manager'
import type { Database } from './supabase'

type Team = Database['public']['Tables']['teams']['Row']
type User = Database['public']['Tables']['users']['Row']
type Performance = Database['public']['Tables']['performances']['Row']
type SlotExpense = Database['public']['Tables']['slot_expenses']['Row']
type Winning = Database['public']['Tables']['winnings']['Row']

interface BatchRequest {
  key: string
  resolver: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

class OptimizedDataService {
  private batchQueue: BatchRequest[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 50 // 50ms batching window

  /**
   * Teams Data Access with Optimizations (via API)
   */
  async getTeams(): Promise<Team[]> {
    const cacheKey = CacheKeys.TEAMS_ALL
    return cacheManager.get(
      cacheKey,
      async () => {
        const token = await getToken()
        const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      },
      'teams'
    )
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return cacheManager.get(
      CacheKeys.TEAM_BY_ID(teamId),
      async () => {
        const teams = await this.getTeams()
        return teams.find(t => t.id === teamId) || null
      },
      'teams'
    )
  }

  /**
   * Users Data Access with Optimizations (via API)
   */
  async getUsers(): Promise<User[]> {
    const cacheKey = CacheKeys.USERS_ALL
    return cacheManager.get(
      cacheKey,
      async () => {
        const token = await getToken()
        const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      },
      'users'
    )
  }

  async getUserProfile(userId: string): Promise<User | null> {
    return cacheManager.get(
      CacheKeys.USER_PROFILE(userId),
      async () => {
        const token = await getToken()
        const res = await fetch(`/api/profile?id=${userId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return null
        const data = await res.json()
        return data || null
      },
      'profile'
    )
  }

  /**
   * Performance Data Access with Optimizations (via API)
   */
  async getPerformances(filters?: { 
    teamId?: string; 
    playerId?: string; 
    days?: number;
    limit?: number;
  }): Promise<Performance[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.PERFORMANCES_BY_TEAM(filters.teamId)
      : filters?.playerId 
        ? CacheKeys.PERFORMANCES_BY_PLAYER(filters.playerId)
        : filters?.days 
          ? CacheKeys.PERFORMANCES_RECENT(filters.days)
          : CacheKeys.PERFORMANCES_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const params = new URLSearchParams()
        if (filters?.days) params.set('timeframe', String(filters.days))
        if (filters?.teamId) params.set('teamId', filters.teamId)
        if (filters?.playerId) params.set('playerId', filters.playerId)
        const token = await getToken()
        const res = await fetch(`/api/performances?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        if (filters?.limit) return list.slice(0, filters.limit)
        return list
      },
      'performances'
    )
  }

  /**
   * Financial Data Access with Optimizations (via API)
   */
  async getExpenses(filters?: { teamId?: string; days?: number }): Promise<(SlotExpense & { team?: Team; slot?: any })[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.EXPENSES_BY_TEAM(filters.teamId)
      : CacheKeys.EXPENSES_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const params = new URLSearchParams()
        if (filters?.teamId) params.set('teamId', filters.teamId)
        if (filters?.days) params.set('timeframe', String(filters.days))
        const token = await getToken()
        const res = await fetch(`/api/expenses?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      },
      'expenses'
    )
  }

  async getWinnings(filters?: { teamId?: string; days?: number }): Promise<(Winning & { team?: Team; slot?: any })[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.WINNINGS_BY_TEAM(filters.teamId)
      : CacheKeys.WINNINGS_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const params = new URLSearchParams()
        if (filters?.teamId) params.set('teamId', filters.teamId)
        if (filters?.days) params.set('timeframe', String(filters.days))
        const token = await getToken()
        const res = await fetch(`/api/winnings?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      },
      'winnings'
    )
  }

  /**
   * Dashboard Data with Caching from APIs
   */
  async getDashboardStats(userId: string, timeframe: string = '30') {
    const cacheKey = CacheKeys.DASHBOARD_STATS(userId, timeframe)
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const token = await getToken()
        const res = await fetch(`/api/dashboard/overview?timeframe=${timeframe}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return {
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
        const payload = await res.json()
        return payload.stats
      },
      'dashboard'
    )
  }

  /**
   * Team Performance Analytics with Caching (via API)
   */
  async getTeamPerformance(teamId: string, days: number = 30) {
    const cacheKey = CacheKeys.TEAM_PERFORMANCE(teamId, days)
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const performances = await this.getPerformances({ teamId, days })
        
        if (performances.length === 0) {
          return {
            totalMatches: 0,
            avgKills: 0,
            avgDamage: 0,
            avgPlacement: 0,
            kdRatio: 0,
            winRate: 0
          }
        }

        const totalMatches = performances.length
        const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
        const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
        const totalPlacements = performances.reduce((sum, p) => sum + (p.placement || 0), 0)
        const wins = performances.filter(p => (p.placement || 0) === 1).length

        return {
          totalMatches,
          avgKills: totalKills / totalMatches,
          avgDamage: totalDamage / totalMatches,
          avgPlacement: totalPlacements / totalMatches,
          kdRatio: totalKills / Math.max(totalMatches - wins, 1),
          winRate: (wins / totalMatches) * 100
        }
      },
      'teamStats'
    )
  }

  private processBatch() {
    if (this.batchQueue.length === 0) return

    const batch = [...this.batchQueue]
    this.batchQueue = []

    const grouped = new Map<string, BatchRequest[]>()
    batch.forEach(request => {
      const baseKey = request.key.split(':')[0]
      if (!grouped.has(baseKey)) {
        grouped.set(baseKey, [])
      }
      grouped.get(baseKey)!.push(request)
    })

    grouped.forEach(async (requests) => {
      try {
        await Promise.all(
          requests.map(async request => {
            try {
              const result = await request.resolver()
              request.resolve(result)
            } catch (error) {
              request.reject(error)
            }
          })
        )
      } catch (error) {
        requests.forEach(req => req.reject(error))
      }
    })
  }

  private calculateDashboardStats(
    performances: Performance[],
    teams: Team[],
    users: User[],
    expenses: SlotExpense[],
    winnings: Winning[]
  ) {
    const totalMatches = performances.length
    const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
    const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
    const totalSurvival = performances.reduce((sum, p) => sum + (p.survival_time || 0), 0)
    
    const totalExpenses = (expenses as any[]).reduce((sum, e) => sum + (e.total || 0), 0)
    const totalWinnings = (winnings as any[]).reduce((sum, w) => sum + (w.amount_won || 0), 0)
    
    const activeTeams = teams.filter(t => (t as any).status === 'active').length
    const activePlayers = users.filter(u => (u as any).role === 'player' && ((u as any).status === 'active' || (u as any).status === 'Active' || (u as any).status === null || (u as any).status === '')).length

    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const todayMatches = performances.filter(p => {
      const perfDate = new Date((p as any).created_at)
      return perfDate.toDateString() === today.toDateString()
    }).length

    const weekMatches = performances.filter(p => {
      const perfDate = new Date((p as any).created_at)
      return perfDate >= weekAgo
    }).length

    const avgPlacement = totalMatches > 0 
      ? performances.reduce((sum, p) => sum + ((p as any).placement || 0), 0) / totalMatches 
      : 0

    return {
      totalMatches,
      totalKills,
      avgDamage: totalMatches > 0 ? totalDamage / totalMatches : 0,
      avgSurvival: totalMatches > 0 ? totalSurvival / totalMatches : 0,
      kdRatio: totalMatches > 0 ? totalKills / totalMatches : 0,
      totalExpense: totalExpenses,
      totalProfitLoss: totalWinnings - totalExpenses,
      activeTeams,
      activePlayers,
      todayMatches,
      weekMatches,
      avgPlacement
    }
  }

  async preloadEssentialData(userId: string, userRole: string) {
    console.log('🚀 Preloading essential data...')
    const preloadPromises = [
      this.getTeams(),
      this.getUserProfile(userId),
      this.getUsers(),
      this.getPerformances({ days: 7 })
    ]
    Promise.allSettled(preloadPromises).then(() => {
      console.log('✅ Essential data preloaded')
    })
  }

  clearCache() { cacheManager.clear() }
  getCacheStats() { return cacheManager.getStats() }
}

export const dataService = new OptimizedDataService()

export const QueryOptimizer = {
  getMinimalUserFields: () => 'id, name, role, team_id, avatar_url, status',
  getMinimalTeamFields: () => 'id, name, tier, status',
  getMinimalPerformanceFields: () => 'id, player_id, team_id, kills, damage, placement, created_at',
  batchQueries: async <T>(queries: (() => Promise<T>)[]): Promise<T[]> => {
    const results = await Promise.all(queries.map(query => query()))
    return results
  },
  getPaginatedQuery: (page: number, limit: number = 50) => ({ from: page * limit, to: (page + 1) * limit - 1 })
}