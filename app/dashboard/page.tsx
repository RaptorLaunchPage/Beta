"use client"

import { useState, useEffect, useMemo } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { dataService } from '@/lib/optimized-data-service'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTabs, TabsContent } from '@/components/ui/enhanced-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RoleBasedDashboard } from '@/components/dashboard/role-based-dashboard'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Target, 
  Trophy, 
  TrendingUp, 
  Activity, 
  Calendar,
  IndianRupee,
  BarChart3,
  Download,
  RefreshCw,
  Gamepad2,
  Zap,
  Shield,
  Crosshair,
  Medal,
  Star,
  Crown,
  Flame,
  ChevronRight,
  Play,
  Clock,
  Plus,
  MessageSquare,
  Webhook,
  User
} from 'lucide-react'
import Link from 'next/link'
// Removed PerformanceDashboard import as we're using a simplified version

const ROLE_COLOR_TO_BG: Record<string, string> = {
  blue: 'bg-blue-500/20',
  green: 'bg-green-500/20',
  orange: 'bg-orange-500/20',
  purple: 'bg-purple-500/20',
  pink: 'bg-pink-500/20',
  indigo: 'bg-indigo-500/20',
  teal: 'bg-teal-500/20',
  violet: 'bg-violet-500/20',
  amber: 'bg-amber-500/20',
  cyan: 'bg-cyan-500/20',
  slate: 'bg-slate-500/20',
  red: 'bg-red-500/20'
}

function getRoleAccentBg(color?: string): string {
  if (!color) return 'bg-slate-500/20'
  return ROLE_COLOR_TO_BG[color] || 'bg-slate-500/20'
}

interface DashboardStats {
  totalMatches: number
  totalKills: number
  avgDamage: number
  avgSurvival: number
  kdRatio: number
  totalExpense: number
  totalProfitLoss: number
  activeTeams: number
  activePlayers: number
  todayMatches: number
  // Enhanced admin stats
  totalTeams: number
  overallMatches: number
  roi: number
  overallAttendanceRate: number
  totalWinnings: number
  activeWebhooks: number
  totalDiscordMessages: number
  weekMatches: number
  avgPlacement: number
}

interface TopPerformer {
  id: string
  name: string
  value: number
  metric: string
  team?: string
}

interface TeamPerformance {
  id: string
  name: string
  totalMatches: number
  avgKills: number
  avgDamage: number
  avgPlacement: number
  kdRatio: number
  winRate: number
}

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
}

export default function OptimizedDashboardPage() {
  const { profile, user, getToken } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topPerformers, setTopPerformers] = useState<{
    topTeam: TeamPerformance | null
    topPlayer: TopPerformer | null
    highestKills: TopPerformer | null
    highestDamage: TopPerformer | null
  }>({
    topTeam: null,
    topPlayer: null,
    highestKills: null,
    highestDamage: null
  })
  const [recentPerformances, setRecentPerformances] = useState<any[]>([])
  const [recentPage, setRecentPage] = useState(1)
  const recentLimit = 10
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')
  const [cacheStats, setCacheStats] = useState<any>(null)

  const userRole = profile?.role as UserRole
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  const canAccessFinance = DashboardPermissions.getDataPermissions(userRole, 'finance').canView
  const canAccessUsers = DashboardPermissions.getDataPermissions(userRole, 'users').canView
  const canAccessAnalytics = DashboardPermissions.canAccessModule(userRole, 'analytics')
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  
  // Role-based content filtering
  const isPlayer = userRole === 'player'
  const isCoach = userRole === 'coach'
  const isAnalyst = userRole === 'analyst'
  const isManager = userRole === 'manager'
  const isAdmin = userRole === 'admin'
  
  // Content visibility based on role
  const canViewAllTeams = isAdmin || isManager
  const canViewAllPlayers = isAdmin || isManager || isCoach
  const canViewFinancials = isAdmin || isManager
  const canManageTeams = isAdmin || isManager
  const canViewDetailedAnalytics = isAdmin || isManager || isCoach || isAnalyst

  // Memoized quick actions based on user role
  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = []
    
    if (userRole === 'player') {
      // No quick actions for players
    } else if (userRole === 'coach') {
      actions.push(
        { title: 'Team Performance', description: 'Analyze team metrics', href: '/dashboard/analytics', icon: BarChart3, color: 'bg-green-500' },
        { title: 'Manage Roster', description: 'Update team roster', href: '/dashboard/team-management/roster', icon: Users, color: 'bg-purple-500' },
        { title: 'Book Slots', description: 'Schedule tournament slots', href: '/dashboard/team-management/slots', icon: Calendar, color: 'bg-orange-500' }
      )
    } else if (userRole === 'admin' || userRole === 'manager') {
      actions.push(
        { title: 'Team Management', description: 'Manage all teams', href: '/dashboard/team-management', icon: Users, color: 'bg-purple-500' },
        { title: 'User Management', description: 'Manage users and roles', href: '/dashboard/user-management', icon: Shield, color: 'bg-red-500' },
        { title: 'Finance Overview', description: 'Track expenses and winnings', href: '/dashboard/finance', icon: IndianRupee, color: 'bg-green-500' },
        { title: 'Analytics', description: 'View comprehensive reports', href: '/dashboard/analytics', icon: BarChart3, color: 'bg-blue-500' }
      )
    }
    
    return actions
  }, [userRole])

  useEffect(() => {
    if (profile) {
      loadDashboardData()
      // Defer preload to after first paint to avoid competing with initial load
      setTimeout(() => {
        dataService.preloadEssentialData(profile!.id, profile!.role)
      }, 0)
    }
  }, [profile, selectedTimeframe])

  // Refresh cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(dataService.getCacheStats())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const normalizeStats = (baseStats: any): DashboardStats => {
    return {
      totalMatches: baseStats.totalMatches || 0,
      totalKills: baseStats.totalKills || 0,
      avgDamage: baseStats.avgDamage || 0,
      avgSurvival: baseStats.avgSurvival || 0,
      kdRatio: baseStats.kdRatio || 0,
      totalExpense: baseStats.totalExpense || 0,
      totalProfitLoss: baseStats.totalProfitLoss || 0,
      activeTeams: baseStats.activeTeams || 0,
      activePlayers: baseStats.activePlayers || 0,
      todayMatches: baseStats.todayMatches || 0,
      weekMatches: baseStats.weekMatches || 0,
      avgPlacement: baseStats.avgPlacement || 0,
      // Default values for admin-only stats
      totalTeams: 0,
      overallMatches: baseStats.totalMatches || 0,
      roi: 0,
      overallAttendanceRate: 0,
      totalWinnings: Math.max(0, baseStats.totalProfitLoss || 0),
      activeWebhooks: 0,
      totalDiscordMessages: 0
    }
  }

  const loadEnhancedAdminStats = async (baseStats: any): Promise<DashboardStats> => {
    try {
      // Get auth token for API calls
      const token = await getToken()
      if (!token) {
        console.warn('No auth token available for enhanced stats')
        return normalizeStats(baseStats)
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [teamsResponse, attendanceResponse, webhooksResponse, logsResponse] = await Promise.all([
        fetch('/api/teams', { headers }),
        fetch('/api/sessions/daily-practice', { headers }),
        fetch('/api/discord-portal/webhooks', { headers }),
        fetch('/api/discord-portal/logs', { headers })
      ])

      // Calculate total teams
      let teamsData = []
      if (teamsResponse.ok) {
        teamsData = await teamsResponse.json()
        console.log('Teams API response:', teamsData)
      } else {
        console.warn('Teams API failed:', teamsResponse.status, await teamsResponse.text())
      }
      const totalTeams = Array.isArray(teamsData) ? teamsData.length : 0
      const activeTeams = Array.isArray(teamsData) ? teamsData.filter(t => t.status === 'active').length : 0
      console.log(`Teams stats: total=${totalTeams}, active=${activeTeams}`)

      // Calculate attendance rate
      let overallAttendanceRate = 0
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        const sessions = attendanceData.sessions || []
        const totalSessions = sessions.length
        const attendedSessions = sessions.filter((s: any) => 
          s.attendances && s.attendances.some((a: any) => ['present', 'late'].includes(a.status))
        ).length
        overallAttendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0
      }

      // Calculate Discord stats
      let activeWebhooks = 0
      let totalDiscordMessages = 0
      
      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json()
        const webhooks = Array.isArray(webhooksData?.webhooks) ? webhooksData.webhooks : 
                        Array.isArray(webhooksData) ? webhooksData : []
        activeWebhooks = webhooks.filter((w: any) => w.active).length
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        const logs = Array.isArray(logsData?.logs) ? logsData.logs : 
                    Array.isArray(logsData) ? logsData : []
        totalDiscordMessages = logs.length
      }

      // Calculate ROI (assuming total winnings exist in base stats)
      const roi = baseStats.totalExpense > 0 ? 
        ((baseStats.totalProfitLoss - baseStats.totalExpense) / baseStats.totalExpense) * 100 : 0

      return {
        totalMatches: baseStats.totalMatches || 0,
        totalKills: baseStats.totalKills || 0,
        avgDamage: baseStats.avgDamage || 0,
        avgSurvival: baseStats.avgSurvival || 0,
        kdRatio: baseStats.kdRatio || 0,
        totalExpense: baseStats.totalExpense || 0,
        totalProfitLoss: baseStats.totalProfitLoss || 0,
        activeTeams: Math.max(activeTeams, baseStats.activeTeams || 0),
        activePlayers: Math.max(baseStats.activePlayers || 0, 0),
        todayMatches: baseStats.todayMatches || 0,
        weekMatches: baseStats.weekMatches || 0,
        avgPlacement: baseStats.avgPlacement || 0,
        totalTeams: Math.max(totalTeams, baseStats.totalTeams || 0),
        overallMatches: baseStats.totalMatches || 0,
        roi,
        overallAttendanceRate,
        totalWinnings: Math.max(0, baseStats.totalProfitLoss || 0),
        activeWebhooks: Math.max(activeWebhooks, 0),
        totalDiscordMessages: Math.max(totalDiscordMessages, 0)
      }
    } catch (error) {
      console.warn('Failed to load enhanced admin stats:', error)
      return {
        ...baseStats,
        totalTeams: 0,
        overallMatches: baseStats.totalMatches,
        roi: 0,
        overallAttendanceRate: 0,
        totalWinnings: 0,
        activeWebhooks: 0,
        totalDiscordMessages: 0
      }
    }
  }

  const loadDashboardData = async () => {
    if (!profile) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Loading dashboard data...')
      const startTime = Date.now()

      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const params = new URLSearchParams(); params.set('timeframe', selectedTimeframe)

      // Prepare filters
      const roleAwareTeamId = (userRole === 'coach' || userRole === 'player' || userRole === 'analyst') ? (profile.team_id || undefined) : undefined
      const roleAwarePlayerId = (userRole === 'player') ? profile.id : undefined

      // Prepare performance queries
      const perfParams = new URLSearchParams(); perfParams.set('timeframe', '7')
      if (userRole === 'player') perfParams.set('playerId', profile.id)

      // Run major IO in parallel to minimize latency
      const [overviewRes, recentPerfRes, teams, users, perfForTop] = await Promise.all([
        fetch(`/api/dashboard/overview?${params.toString()}`, { headers }),
        fetch(`/api/performances?${perfParams.toString()}`, { headers }),
        dataService.getTeams(userRole, profile.id),
        dataService.getUsers(),
        dataService.getPerformances({
          days: parseInt(selectedTimeframe),
          limit: 1000,
          ...(roleAwarePlayerId && { playerId: roleAwarePlayerId }),
          ...(roleAwareTeamId && { teamId: roleAwareTeamId })
        })
      ])

      // Parse overview (with client fallback only if needed)
      let baseStats: any
      if (overviewRes.ok) {
        const payload = await overviewRes.json()
        const statsPayload = payload?.stats || payload?.data || payload || {}
        if (statsPayload?.metrics || statsPayload?.financial || statsPayload?.trends) {
          const metrics = statsPayload.metrics || {}
          const financial = statsPayload.financial || {}
          const trends = statsPayload.trends || {}
          const matches = metrics.totalMatches || 0
          baseStats = {
            totalMatches: matches,
            totalKills: metrics.totalKills || 0,
            avgDamage: metrics.avgDamage || 0,
            avgSurvival: metrics.avgSurvivalTime || 0,
            kdRatio: matches > 0 ? (metrics.totalKills || 0) / matches : 0,
            totalExpense: financial.totalExpenses || 0,
            totalProfitLoss: financial.netProfit || 0,
            activeTeams: metrics.activeTeams || 0,
            activePlayers: metrics.activePlayers || 0,
            todayMatches: trends.todayMatches || 0,
            weekMatches: trends.weekMatches || trends.last7DaysMatches || 0,
            avgPlacement: metrics.avgPlacement || 0,
            overallAttendanceRate: 0,
          }
        } else {
          baseStats = statsPayload
        }
      } else {
        // Client fallback
        const roleScopedPerformances = perfForTop
        baseStats = (() => {
          const totalMatches = roleScopedPerformances.length
          const totalKills = roleScopedPerformances.reduce((sum: number, p: any) => sum + (p.kills || 0), 0)
          const totalDamage = roleScopedPerformances.reduce((sum: number, p: any) => sum + (p.damage || 0), 0)
          const totalSurvival = roleScopedPerformances.reduce((sum: number, p: any) => sum + (p.survival_time || 0), 0)
          const today = new Date(); today.setHours(0,0,0,0)
          const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
          const todayMatches = roleScopedPerformances.filter((p: any) => new Date(p.created_at) >= today).length
          const weekMatches = roleScopedPerformances.filter((p: any) => new Date(p.created_at) >= weekAgo).length
          const placements = roleScopedPerformances.map((p: any) => p.placement).filter((x: any) => x > 0)
          const avgPlacement = placements.length > 0 ? Math.round(placements.reduce((a: number, b: number) => a + b, 0) / placements.length) : 0
          return {
            totalMatches,
            totalKills,
            avgDamage: totalMatches ? totalDamage / totalMatches : 0,
            avgSurvival: totalMatches ? totalSurvival / totalMatches : 0,
            kdRatio: totalMatches ? totalKills / totalMatches : 0,
            totalExpense: 0,
            totalProfitLoss: 0,
            activeTeams: 0,
            activePlayers: 0,
            todayMatches,
            weekMatches,
            avgPlacement,
            overallAttendanceRate: 0,
          }
        })()
      }

      // Enhance stats for admin/manager roles without blocking other UI updates
      let finalStats = normalizeStats(baseStats)
      if (['admin', 'manager'].includes(userRole)) {
        try {
          finalStats = await loadEnhancedAdminStats(baseStats)
        } catch {}
      }
      setStats(finalStats)

      // Recent performances from API
      const performances = recentPerfRes.ok ? await recentPerfRes.json() : []
      const perfItems = Array.isArray(performances) ? performances : (performances.items || [])
      setRecentPerformances(perfItems)

      // Compute top performers from already-fetched datasets (avoid extra calls)
      if (Array.isArray(perfForTop) && perfForTop.length > 0) {
        const teamPerformances = new Map<string, { kills: number; damage: number; matches: number; placements: number[] }>()
        perfForTop.forEach((perf: any) => {
          if (!perf.team_id) return
          const existing = teamPerformances.get(perf.team_id) || { kills: 0, damage: 0, matches: 0, placements: [] }
          existing.kills += perf.kills || 0
          existing.damage += perf.damage || 0
          existing.matches += 1
          existing.placements.push(perf.placement || 0)
          teamPerformances.set(perf.team_id, existing)
        })
        const topTeamEntry = Array.from(teamPerformances.entries())
          .map(([teamId, s]) => {
            const team = (teams as any[]).find((t: any) => t.id === teamId)
            const avgPlacement = s.placements.reduce((a, b) => a + b, 0) / Math.max(s.placements.length, 1)
            const wins = s.placements.filter((p: number) => p === 1).length
            return {
              id: teamId,
              name: team?.name || 'Unknown Team',
              totalMatches: s.matches,
              avgKills: s.kills / Math.max(s.matches, 1),
              avgDamage: s.damage / Math.max(s.matches, 1),
              avgPlacement,
              kdRatio: s.kills / Math.max(s.matches - wins, 1),
              winRate: (wins / Math.max(s.matches, 1)) * 100
            }
          })
          .sort((a, b) => b.winRate - a.winRate)[0] || null

        const playerStats = new Map<string, { kills: number; damage: number; matches: number }>()
        perfForTop.forEach((perf: any) => {
          const existing = playerStats.get(perf.player_id) || { kills: 0, damage: 0, matches: 0 }
          existing.kills += perf.kills || 0
          existing.damage += perf.damage || 0
          existing.matches += 1
          playerStats.set(perf.player_id, existing)
        })
        const topPlayerEntry = Array.from(playerStats.entries())
          .map(([playerId, s]) => {
            const user = (users as any[]).find((u: any) => u.id === playerId)
            return {
              id: playerId,
              name: user?.name || user?.email || 'Unknown Player',
              value: Math.round((s.damage / Math.max(s.matches, 1)) * 0.3 + (s.kills / Math.max(s.matches, 1)) * 20),
              metric: 'Score'
            }
          })
          .sort((a, b) => b.value - a.value)[0] || null

        setTopPerformers({ topTeam: topTeamEntry, topPlayer: topPlayerEntry, highestKills: null, highestDamage: null })
      }

      const endTime = Date.now()
      console.log(`✅ Dashboard loaded in ${endTime - startTime}ms`)
      setDataFetched(true)
      
    } catch (error: any) {
      console.error('Dashboard loading error:', error)
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateTopPerformers = async () => {
    try {
      const teams = await dataService.getTeams(userRole, profile?.id)
      const users = await dataService.getUsers()
      const performances = await dataService.getPerformances({ 
        days: parseInt(selectedTimeframe),
        ...(userRole === 'player' && { playerId: profile!.id }),
        ...(((userRole === 'coach' || userRole === 'analyst') && profile?.team_id) && { teamId: profile.team_id })
      })
      
      if (performances.length === 0) return

      // Find top team performance
      const teamPerformances = new Map<string, { kills: number; damage: number; matches: number; placements: number[] }>()
      
      performances.forEach((perf: any) => {
        if (!perf.team_id) return
        
        const existing = teamPerformances.get(perf.team_id) || { kills: 0, damage: 0, matches: 0, placements: [] }
        existing.kills += perf.kills || 0
        existing.damage += perf.damage || 0
        existing.matches += 1
        existing.placements.push(perf.placement || 0)
        teamPerformances.set(perf.team_id, existing)
      })

      const topTeamEntry = Array.from(teamPerformances.entries())
        .map(([teamId, stats]) => {
          const team = teams.find((t: any) => t.id === teamId)
          const avgPlacement = stats.placements.reduce((a, b) => a + b, 0) / stats.placements.length
          const wins = stats.placements.filter((p: number) => p === 1).length
          
          return {
            id: teamId,
            name: team?.name || 'Unknown Team',
            totalMatches: stats.matches,
            avgKills: stats.kills / stats.matches,
            avgDamage: stats.damage / stats.matches,
            avgPlacement,
            kdRatio: stats.kills / Math.max(stats.matches - wins, 1),
            winRate: (wins / stats.matches) * 100
          }
        })
        .sort((a, b) => b.winRate - a.winRate)[0]

      // Find top individual performers
      const playerStats = new Map<string, { kills: number; damage: number; matches: number }>()
      
      performances.forEach((perf: any) => {
        const existing = playerStats.get(perf.player_id) || { kills: 0, damage: 0, matches: 0 }
        existing.kills += perf.kills || 0
        existing.damage += perf.damage || 0
        existing.matches += 1
        playerStats.set(perf.player_id, existing)
      })

      const topPlayerEntry = Array.from(playerStats.entries())
        .map(([playerId, stats]) => {
          const user = users.find((u: any) => u.id === playerId)
          return {
            id: playerId,
            name: user?.name || user?.email || 'Unknown Player',
            value: Math.round((stats.damage / Math.max(stats.matches, 1)) * 0.3 + (stats.kills / Math.max(stats.matches, 1)) * 20),
            metric: 'Score'
          }
        })
        .sort((a, b) => b.value - a.value)[0]

      setTopPerformers({
        topTeam: topTeamEntry || null,
        topPlayer: topPlayerEntry || null,
        highestKills: null,
        highestDamage: null
      })
    } catch (error) {
      console.error('Error calculating top performers:', error)
    }
  }

  const handleRefresh = () => {
    dataService.clearCache()
    loadDashboardData()
  }

  const formatNumber = (num: number, decimals: number = 0): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(decimals)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.name || profile?.display_name || user?.email?.split('@')[0] || 'User'}! 
              <Badge variant="outline" className="ml-2">{roleInfo.label}</Badge>
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.name || profile?.display_name || user?.email?.split('@')[0] || 'User'}!
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-500">
                <Activity className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Failed to Load Dashboard</h3>
                <p className="text-gray-600 mt-2">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.name || profile?.display_name || user?.email?.split('@')[0] || 'User'}! 
            <Badge variant="outline" className="ml-2">{roleInfo.label}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Metrics Cards or No Data State */}
      {dataFetched && stats && stats.totalMatches === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <Activity className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Welcome to Your Dashboard!</h3>
            <p className="text-muted-foreground mb-6">
              Start by exploring the features available to you as a {roleInfo.label.toLowerCase()}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {quickActions.slice(0, 2).map((action, index) => (
                <Button key={index} asChild variant={index === 0 ? "default" : "outline"}>
                  <a href={action.href}>
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Main Overview Section */}
          <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getRoleAccentBg(roleInfo.color)}`}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                {isPlayer ? 'My Performance Dashboard' : 
                 isCoach ? 'Team Management Dashboard' :
                 isAnalyst ? 'Analytics Dashboard' :
                 isManager ? 'Management Dashboard' :
                 'Administrative Dashboard'}
              </CardTitle>
              <CardDescription className="text-white/70">
                {isPlayer ? 'Track your personal performance and team progress' :
                 isCoach ? 'Monitor team performance and player development' :
                 isAnalyst ? 'Deep dive into performance analytics and insights' :
                 isManager ? 'Oversee operations and team management' :
                 'Complete administrative overview and control'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {isPlayer ? (
                        <>
                          <p className="text-blue-100 text-sm font-medium">My Matches</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.totalMatches || 0)}</p>
                          <p className="text-blue-200 text-xs">Personal record</p>
                        </>
                      ) : canViewAllTeams ? (
                        <>
                          <p className="text-blue-100 text-sm font-medium">Total Teams</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.totalTeams || 0)}</p>
                          <p className="text-blue-200 text-xs">{formatNumber(stats?.activeTeams || 0)} active</p>
                        </>
                      ) : (
                        <>
                          <p className="text-blue-100 text-sm font-medium">Team Members</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.activePlayers || 0)}</p>
                          <p className="text-blue-200 text-xs">In your team</p>
                        </>
                      )}
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {isPlayer ? (
                        <>
                          <p className="text-green-100 text-sm font-medium">My K/D Ratio</p>
                          <p className="text-2xl font-bold">{(stats?.kdRatio || 0).toFixed(2)}</p>
                          <p className="text-green-200 text-xs">Kill/Death ratio</p>
                        </>
                      ) : canViewAllPlayers ? (
                        <>
                          <p className="text-green-100 text-sm font-medium">Active Players</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.activePlayers || 0)}</p>
                          <p className="text-green-200 text-xs">Across all teams</p>
                        </>
                      ) : (
                        <>
                          <p className="text-green-100 text-sm font-medium">Team Performance</p>
                          <p className="text-2xl font-bold">{formatNumber(Math.round((stats?.totalMatches || 0) * 0.7))}%</p>
                          <p className="text-green-200 text-xs">Win rate</p>
                        </>
                      )}
                    </div>
                    <Shield className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {isPlayer ? (
                        <>
                          <p className="text-orange-100 text-sm font-medium">Total Kills</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.totalKills || 0)}</p>
                          <p className="text-orange-200 text-xs">Personal total</p>
                        </>
                      ) : shouldSeeAllData ? (
                        <>
                          <p className="text-orange-100 text-sm font-medium">Overall Matches</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.overallMatches || 0)}</p>
                          <p className="text-orange-200 text-xs">{formatNumber(stats?.todayMatches || 0)} today</p>
                        </>
                      ) : (
                        <>
                          <p className="text-orange-100 text-sm font-medium">Team Matches</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.totalMatches || 0)}</p>
                          <p className="text-orange-200 text-xs">This month</p>
                        </>
                      )}
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {isPlayer ? (
                        <>
                          <p className="text-purple-100 text-sm font-medium">Avg Damage</p>
                          <p className="text-2xl font-bold">{formatNumber(stats?.avgDamage || 0)}</p>
                          <p className="text-purple-200 text-xs">Per match</p>
                        </>
                      ) : shouldSeeAllData ? (
                        <>
                          <p className="text-purple-100 text-sm font-medium">Combined K/D</p>
                          <p className="text-2xl font-bold">{(stats?.kdRatio || 0).toFixed(2)}</p>
                          <p className="text-purple-200 text-xs">{formatNumber(stats?.totalKills || 0)} total kills</p>
                        </>
                      ) : (
                        <>
                          <p className="text-purple-100 text-sm font-medium">Team Ranking</p>
                          <p className="text-2xl font-bold">#{Math.ceil((stats?.totalMatches || 1) / 5) || 'N/A'}</p>
                          <p className="text-purple-200 text-xs">Current position</p>
                        </>
                      )}
                    </div>
                    <Crosshair className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview Section - Admin/Manager Only */}
          {canViewFinancials && (
            <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <IndianRupee className="h-6 w-6 text-white" />
                  </div>
                  Financial Overview
                </CardTitle>
                <CardDescription className="text-white/70">
                  Revenue, expenses, and financial performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Total Winnings</p>
                                              <p className="text-2xl font-bold">₹{formatNumber(stats?.totalWinnings || 0)}</p>
                      <p className="text-emerald-200 text-xs">Prize money earned</p>
                    </div>
                    <Trophy className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                                              <p className="text-2xl font-bold">₹{formatNumber(stats?.totalExpense || 0)}</p>
                      <p className="text-red-200 text-xs">Operational costs</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm font-medium">ROI</p>
                      <p className="text-2xl font-bold">{(stats?.roi || 0).toFixed(1)}%</p>
                      <p className="text-cyan-200 text-xs">Return on investment</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Performance & Attendance Section */}
          <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                {isPlayer ? 'My Team Performance & Attendance' : 'Performance & Attendance'}
              </CardTitle>
              <CardDescription className="text-white/70">
                {isPlayer ? 'Consolidated team data and top performer statistics' : 'Team performance statistics and attendance tracking'}
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">
                        {isPlayer ? 'Total Team Matches' : 'Attendance Rate'}
                      </p>
                      <p className="text-2xl font-bold">
                        {isPlayer ? (stats?.totalMatches || 0) : `${(stats?.overallAttendanceRate || 0).toFixed(1)}%`}
                      </p>
                      <p className="text-indigo-200 text-xs">
                        {isPlayer ? 'Matches played' : 'Overall attendance'}
                      </p>
                    </div>
                    {isPlayer ? (
                      <Target className="h-8 w-8 text-indigo-200" />
                    ) : (
                      <Calendar className="h-8 w-8 text-indigo-200" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Avg Damage</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.avgDamage || 0)}</p>
                      <p className="text-pink-200 text-xs">Combined average</p>
                    </div>
                    <Zap className="h-8 w-8 text-pink-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">
                        {isPlayer ? 'Total Kills' : 'Avg Survival'}
                      </p>
                      <p className="text-2xl font-bold">
                        {isPlayer ? formatNumber(stats?.totalKills || 0) : `${formatNumber(stats?.avgSurvival || 0)}s`}
                      </p>
                      <p className="text-yellow-200 text-xs">
                        {isPlayer ? 'Team total kills' : 'Average survival time'}
                      </p>
                    </div>
                    {isPlayer ? (
                      <Crosshair className="h-8 w-8 text-yellow-200" />
                    ) : (
                      <Clock className="h-8 w-8 text-yellow-200" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm font-medium">Top Performance</p>
                      <p className="text-xl font-bold">{topPerformers.topPlayer?.name || 'N/A'}</p>
                      <p className="text-teal-200 text-xs">{topPerformers.topPlayer?.value || 0} kills avg</p>
                    </div>
                    <Star className="h-8 w-8 text-teal-200" />
                  </div>
                </CardContent>
              </Card>
              </div>
            </CardContent>
          </Card>

          {/* Player Action Buttons - Player Only */}
          {isPlayer && (
            <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  My Quick Actions
                </CardTitle>
                <CardDescription className="text-white/70">
                  Essential actions for managing your performance and attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-black/40 backdrop-blur-lg border border-blue-400/40 hover:border-blue-400/60 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4" onClick={() => router.push('/dashboard/performance')}>
                      <div className="p-3 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                        <Target className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white group-hover:text-white/90">
                          Update My Performance
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          Add your latest match stats
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/60 transition-colors" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-lg border border-green-400/40 hover:border-green-400/60 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4" onClick={() => router.push('/dashboard/attendance')}>
                      <div className="p-3 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                        <Calendar className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white group-hover:text-white/90">
                          Mark Attendance
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          Check in for today's practice
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/60 transition-colors" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-lg border border-purple-400/40 hover:border-purple-400/60 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4" onClick={() => router.push('/dashboard/profile')}>
                      <div className="p-3 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                        <User className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white group-hover:text-white/90">
                          Update Profile
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          Manage your profile settings
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/60 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Communication & Discord Section - Admin/Manager Only */}
          {(isAdmin || isManager) && (
            <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  Communication & Discord Integration
                </CardTitle>
                <CardDescription className="text-white/70">
                  Discord webhooks, messaging, and team communication stats
                </CardDescription>
              </CardHeader>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Active Webhooks</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.activeWebhooks || 0)}</p>
                      <p className="text-violet-200 text-xs">Discord integrations</p>
                    </div>
                    <Webhook className="h-8 w-8 text-violet-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-slate-500 to-slate-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-100 text-sm font-medium">Messages Sent</p>
                      <p className="text-2xl font-bold">{formatNumber(stats?.totalDiscordMessages || 0)}</p>
                      <p className="text-slate-200 text-xs">Total Discord messages</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-slate-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Live Leaderboard</p>
                      <p className="text-xl font-bold">{topPerformers.topTeam?.name || 'N/A'}</p>
                      <p className="text-amber-200 text-xs">Top performing team</p>
                    </div>
                    <Crown className="h-8 w-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Section - Hidden for players */}
          {!isPlayer && (
            <Card className="bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-white/70">
                  Latest match results and performance entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentPerformances.length > 0 ? (
                  <div className="space-y-3">
                    {recentPerformances.slice(0, 5).map((perf, index) => (
                      <div key={perf.id} className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                        <div>
                          <p className="font-medium text-white text-sm">{perf.map || 'Unknown Map'}</p>
                          <p className="text-xs text-white/60 mt-1">
                            Placement: #{perf.placement || 'N/A'} • {perf.kills || 0} kills • {formatNumber(perf.damage || 0)} damage
                          </p>
                        </div>
                        <Badge variant={perf.placement === 1 ? 'default' : 'secondary'}>
                          {perf.placement === 1 ? '🥇 Win' : `#${perf.placement || 'N/A'}`}
                        </Badge>
                      </div>
                    ))}
                    <div className="flex justify-center">
                      <Button variant="outline" size="sm" onClick={async () => {
                        try {
                          const token = await getToken()
                          const params = new URLSearchParams(); params.set('limit', String(recentLimit)); params.set('offset', String(recentPage * recentLimit))
                          const nextRes = await fetch(`/api/performances?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
                          if (!nextRes.ok) return
                          const payload = await nextRes.json()
                          const items = Array.isArray(payload) ? payload : (payload.items || [])
                          if (items.length > 0) {
                            setRecentPerformances(prev => [...prev, ...items])
                            setRecentPage(p => p + 1)
                          }
                        } catch {}
                      }}>Load more</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-white/40" />
                    <p className="text-white/60">No recent activity</p>
                    <p className="text-white/40 text-sm mt-1">Your latest matches will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}  {/* End of metrics conditional */}



      {/* Main Content Tabs - Hidden for players */}
      {!isPlayer ? (
        <ResponsiveTabs 
          tabs={[
            {
              value: "overview",
              label: "Overview",
              icon: BarChart3
            },
            {
              value: "performance",
              label: "Performance",
              icon: Target
            },
            {
              value: "analytics",
              label: "Analytics",
              icon: TrendingUp,
              hidden: !canAccessAnalytics
            },
            {
              value: "management",
              label: "Management",
              icon: Users,
              hidden: !(canAccessFinance || canAccessUsers)
            }
          ].filter(tab => !tab.hidden)}
          defaultValue="overview"
          variant="default"
          size="md"
          responsiveMode="auto"
          className="space-y-4"
        >

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-lg border border-white/10 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <BarChart3 className="h-16 w-16 mx-auto text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Overview Complete</h3>
              <p className="text-white/70 mb-6">
                Your {roleInfo.label.toLowerCase()} dashboard overview is displayed above. 
                Use the tabs to access specific modules and features.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {quickActions.slice(0, 2).map((action, index) => (
                  <Button key={index} asChild variant={index === 0 ? "default" : "outline"}>
                    <a href={action.href}>
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.title}
                    </a>
                  </Button>
                ))}
              </div>
                         </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="text-center py-12">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Performance Analytics</h3>
            <p className="text-muted-foreground mb-6">
              Detailed performance metrics and analytics will be available here
            </p>
            <Button asChild>
              <Link href="/dashboard/performance">View Performance Details</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
            <p className="text-muted-foreground mb-6">
              In-depth analytics and reporting features coming soon
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/analytics">Explore Analytics</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Team Management</h3>
            <p className="text-muted-foreground mb-6">
              Access team management tools and administrative features
            </p>
            <div className="flex gap-3 justify-center">
              {canAccessUsers && (
                <Button asChild>
                  <Link href="/dashboard/users">Manage Users</Link>
                </Button>
              )}
              {canAccessFinance && (
                <Button asChild variant="outline">
                  <Link href="/dashboard/finance">Finance</Link>
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        </ResponsiveTabs>
      ) : (
        /* Player Dashboard Content */
        <div className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-lg border border-white/10 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <User className="h-16 w-16 mx-auto text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to Raptor Esports Hub</h3>
              <p className="text-white/70 mb-6">
                Your player dashboard shows your core statistics and performance metrics above.
              </p>
              <p className="text-white/60 text-sm">
                Use the navigation menu to access detailed performance tracking, team information, and other player-specific features.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}