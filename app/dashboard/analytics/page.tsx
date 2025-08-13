"use client"

import { useState, useEffect } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { DashboardData, type DashboardDataOptions } from '@/lib/dashboard-data'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { supabase } from '@/lib/supabase'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTabs, TabsContent } from '@/components/ui/enhanced-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  Download, 
  Filter, 
  TrendingUp, 
  Target, 
  Users, 
  Calendar,
  PieChart,
  LineChart,
  Activity,
  Gamepad2,
  Crosshair,
  Zap,
  Shield,
  Trophy,
  RefreshCw
} from 'lucide-react'
import { 
  PerformanceAnalyticsSection,
  TeamAnalyticsSection,
  TrendAnalyticsSection
} from '@/components/analytics/analytics-sections'

interface AnalyticsStats {
  totalMatches: number
  totalKills: number
  avgDamage: number
  avgSurvival: number
  kdRatio: number
  avgPlacement: number
  todayMatches: number
  weekMatches: number
  monthMatches: number
  topPlayer: {
    name: string
    kills: number
    damage: number
  } | null
  topTeam: {
    name: string
    wins: number
    matches: number
  } | null
}

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedMap, setSelectedMap] = useState('all')
  const [teams, setTeams] = useState<any[]>([])
  const [maps, setMaps] = useState<string[]>([])

  const userRole = profile?.role as UserRole
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  const canExportPerformance = DashboardPermissions.getDataPermissions(userRole, 'performance').canExport
  const canExportTeams = DashboardPermissions.getDataPermissions(userRole, 'teams').canExport

  useEffect(() => {
    if (profile) {
      loadAnalyticsData()
    }
  }, [profile, selectedTimeframe, selectedTeam, selectedMap])

  // Auto-select team for players when profile loads
  useEffect(() => {
    if (profile?.role === 'player' && profile?.team_id && selectedTeam === 'all') {
      setSelectedTeam(profile.team_id)
    }
  }, [profile?.role, profile?.team_id, selectedTeam])

  const loadAnalyticsData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    
    try {
      // For players, check if they have team assignment
      if (profile.role === 'player' && !profile.team_id) {
        setError('You need to be assigned to a team to view analytics data. Please contact your manager.')
        setLoading(false)
        return
      }

      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const params = new URLSearchParams()
      params.set('timeframe', selectedTimeframe)
      if (selectedTeam !== 'all') params.set('teamId', selectedTeam)
      if (selectedMap !== 'all') params.set('map', selectedMap)

      // Fetch performances through API
      const perfsRes = await fetch(`/api/performances?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!perfsRes.ok) throw new Error(`Failed to fetch performances: ${perfsRes.status}`)
      const performances = await perfsRes.json()

      // Fetch teams via API
      const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const teamsData = teamsRes.ok ? await teamsRes.json() : []
      setTeams(Array.isArray(teamsData) ? teamsData : [])

      // Build maps from performances locally
      const uniqueMaps = [...new Set((performances || []).map((p: any) => p.map).filter(Boolean))]
      setMaps(uniqueMaps)

      // Calculate analytics stats
      const calculatedStats = calculateAnalyticsStats(performances || [])
      setStats(calculatedStats)
      setDataFetched(true)
      
    } catch (err: any) {
      console.error('Error loading analytics data:', err)
      console.error('Full error details:', err)
      
      let errorMessage = 'Failed to load analytics data'
      if (err.message) {
        errorMessage = err.message
      } else if (err.details) {
        errorMessage = `Database error: ${err.details}`
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalyticsStats = (performances: any[]): AnalyticsStats => {
    if (!performances || performances.length === 0) {
      return {
        totalMatches: 0,
        totalKills: 0,
        avgDamage: 0,
        avgSurvival: 0,
        kdRatio: 0,
        avgPlacement: 0,
        todayMatches: 0,
        weekMatches: 0,
        monthMatches: 0,
        topPlayer: null,
        topTeam: null
      }
    }

    const totalMatches = performances.length
    const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
    const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
    const totalSurvival = performances.reduce((sum, p) => sum + (p.survival_time || 0), 0)
    const totalPlacement = performances.reduce((sum, p) => sum + (p.placement || 0), 0)

    const avgDamage = totalMatches > 0 ? totalDamage / totalMatches : 0
    const avgSurvival = totalMatches > 0 ? totalSurvival / totalMatches : 0
    const kdRatio = totalMatches > 0 ? totalKills / totalMatches : 0
    const avgPlacement = totalMatches > 0 ? Math.round(totalPlacement / totalMatches) : 0

    // Calculate time-based matches
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const todayMatches = performances.filter(p => new Date(p.created_at) >= today).length
    const weekMatches = performances.filter(p => new Date(p.created_at) >= weekAgo).length
    const monthMatches = performances.filter(p => new Date(p.created_at) >= monthAgo).length

    // Find top player
    const playerStats = new Map()
    performances.forEach(perf => {
      const playerId = perf.users?.id
      const playerName = perf.users?.name || perf.users?.email
      
      if (!playerId || !playerName) return
      
      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          name: playerName,
          kills: 0,
          damage: 0,
          matches: 0
        })
      }
      
      const stats = playerStats.get(playerId)
      stats.kills += perf.kills || 0
      stats.damage += perf.damage || 0
      stats.matches += 1
    })

    let topPlayer = null
    let maxScore = 0
    for (const [playerId, stats] of playerStats) {
      const score = stats.kills + (stats.damage / 100) // Simple scoring
      if (score > maxScore) {
        maxScore = score
        topPlayer = {
          name: stats.name,
          kills: stats.kills,
          damage: Math.round(stats.damage / stats.matches)
        }
      }
    }

    // Find top team
    const teamStats = new Map()
    performances.forEach(perf => {
      const teamId = perf.teams?.id
      const teamName = perf.teams?.name
      
      if (!teamId || !teamName) return
      
      if (!teamStats.has(teamId)) {
        teamStats.set(teamId, {
          name: teamName,
          wins: 0,
          matches: 0
        })
      }
      
      const stats = teamStats.get(teamId)
      stats.matches += 1
      if (perf.placement === 1) stats.wins += 1
    })

    let topTeam = null
    let maxWinRate = 0
    for (const [teamId, stats] of teamStats) {
      const winRate = stats.matches > 0 ? stats.wins / stats.matches : 0
      if (winRate > maxWinRate && stats.matches >= 3) { // Minimum 3 matches
        maxWinRate = winRate
        topTeam = {
          name: stats.name,
          wins: stats.wins,
          matches: stats.matches
        }
      }
    }

    return {
      totalMatches,
      totalKills,
      avgDamage,
      avgSurvival,
      kdRatio,
      avgPlacement,
      todayMatches,
      weekMatches,
      monthMatches,
      topPlayer,
      topTeam
    }
  }

  const handleExport = async (dataType: 'performance' | 'teams') => {
    if (!profile) return

    try {
      const options: DashboardDataOptions = {
        role: userRole,
        userId: profile.id,
        teamId: profile.team_id,
        timeframe: selectedTimeframe
      }

      const csvData = await DashboardData.exportData(dataType, options, 'csv')
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${dataType}-analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Export error:', error)
      setError('Export failed: ' + error.message)
    }
  }

  const handleRefresh = () => {
    loadAnalyticsData()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {profile?.role === 'player' && !profile?.team_id ? (
              <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="font-medium text-yellow-800">Team Assignment Required</p>
                <p className="mt-1">As a player, you need to be assigned to a team to access analytics data.</p>
                <p className="mt-2">Please contact your team manager or administrator for assistance.</p>
              </div>
            ) : error?.includes('Teams API Error 403') ? (
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-medium text-blue-800">Loading Analytics Data</p>
                <p className="mt-1">We're setting up your analytics view. This may take a moment...</p>
                <Button onClick={handleRefresh} variant="outline" className="mt-3">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
            ) : (
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
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
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Advanced analytics and performance insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canExportPerformance && (
            <Button onClick={() => handleExport('performance')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/40 backdrop-blur-lg border border-red-400/60 shadow-xl text-white rounded-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-200 drop-shadow-md">
              <Activity className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Customize your analytics view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  {profile?.role !== 'player' && <SelectItem value="all">All Teams</SelectItem>}
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Map</label>
              <Select value={selectedMap} onValueChange={setSelectedMap}>
                <SelectTrigger>
                  <SelectValue placeholder="All Maps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Maps</SelectItem>
                  {maps.map(map => (
                    <SelectItem key={map} value={map}>
                      {map}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Content */}
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
            value: "teams",
            label: "Teams",
            icon: Users
          },
          {
            value: "trends",
            label: "Trends",
            icon: TrendingUp
          }
        ]}
        defaultValue="overview"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="space-y-4"
      >

        <TabsContent value="overview" className="space-y-6">
          {(!dataFetched || (stats && stats.totalMatches === 0)) ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  <BarChart3 className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Analytics Data Yet</h3>
                <p className="text-muted-foreground mb-6">
                  {selectedTeam !== "all" || selectedMap !== "all" 
                    ? "No performance data matches your current filters. Try adjusting the filters above."
                    : "Start by adding some performance data to see analytics and insights."}
                </p>
                <Button asChild>
                  <a href="/dashboard/performance">
                    <Target className="h-4 w-4 mr-2" />
                    Add Performance Data
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Matches</p>
                        <p className="text-2xl font-bold">{stats?.totalMatches || 0}</p>
                      </div>
                      <Gamepad2 className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Total Kills</p>
                        <p className="text-2xl font-bold">{stats?.totalKills || 0}</p>
                      </div>
                      <Crosshair className="h-8 w-8 text-red-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Avg Damage</p>
                        <p className="text-2xl font-bold">{stats?.avgDamage?.toFixed(0) || 0}</p>
                      </div>
                      <Zap className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">K/D Ratio</p>
                        <p className="text-2xl font-bold">{stats?.kdRatio?.toFixed(2) || '0.00'}</p>
                      </div>
                      <Target className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Avg Survival</p>
                        <p className="text-2xl font-bold">{stats?.avgSurvival?.toFixed(1) || '0.0'}min</p>
                      </div>
                      <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Avg Placement</p>
                        <p className="text-2xl font-bold">#{stats?.avgPlacement || 0}</p>
                      </div>
                      <Trophy className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Today</p>
                        <p className="text-2xl font-bold">{stats?.todayMatches || 0}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">This Week</p>
                        <p className="text-2xl font-bold">{stats?.weekMatches || 0}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top Player
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats?.topPlayer ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{stats.topPlayer.name}</span>
                          <Badge variant="secondary">MVP</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Kills</p>
                            <p className="font-semibold">{stats.topPlayer.kills}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Damage</p>
                            <p className="font-semibold">{stats.topPlayer.damage}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No player data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Top Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats?.topTeam ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{stats.topTeam.name}</span>
                          <Badge variant="secondary">
                            {((stats.topTeam.wins / stats.topTeam.matches) * 100).toFixed(1)}% WR
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Wins</p>
                            <p className="font-semibold">{stats.topTeam.wins}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Matches</p>
                            <p className="font-semibold">{stats.topTeam.matches}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No team data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceAnalyticsSection 
            profile={profile}
            selectedTimeframe={selectedTimeframe}
            selectedTeam={selectedTeam}
            selectedMap={selectedMap}
          />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <TeamAnalyticsSection 
            profile={profile}
            selectedTimeframe={selectedTimeframe}
            selectedTeam={selectedTeam}
            selectedMap={selectedMap}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendAnalyticsSection 
            profile={profile}
            selectedTimeframe={selectedTimeframe}
            selectedTeam={selectedTeam}
            selectedMap={selectedMap}
          />
        </TabsContent>
      </ResponsiveTabs>
    </div>
  )
}