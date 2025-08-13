"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { 
  Target, 
  Users, 
  TrendingUp, 
  BarChart3,
  Crosshair,
  Zap,
  Shield,
  Trophy,
  Activity,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react'
import {
  PerformanceTrendChart,
  TeamComparisonChart,
  PlayerRadarChart,
  MapPerformanceChart,
  KillDistributionChart,
  MetricCard
} from './advanced-charts'
import { 
  PDFExporter, 
  preparePerformanceDataForPDF, 
  prepareTeamDataForPDF, 
  prepareTrendDataForPDF 
} from '@/lib/pdf-export'

interface AnalyticsSectionProps {
  profile: any
  selectedTimeframe: string
  selectedTeam: string
  selectedMap: string
}

// Performance Analytics Section
export function PerformanceAnalyticsSection({ 
  profile, 
  selectedTimeframe, 
  selectedTeam, 
  selectedMap 
}: AnalyticsSectionProps) {
  const { getToken } = useAuth()
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all')
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    loadPerformanceData()
  }, [profile, selectedTimeframe, selectedTeam, selectedMap, selectedPlayer])

  const loadPerformanceData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams({
        type: 'player',
        timeframe: selectedTimeframe,
        ...(selectedTeam !== 'all' && { teamId: selectedTeam }),
        ...(selectedPlayer !== 'all' && { playerId: selectedPlayer })
      })

      const response = await fetch(`/api/analytics/performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load performance data: ${response.status}`)
      }

      const result = await response.json()
      setPerformanceData(result.data)

      // Load players for selection
      if (result.data?.topPerformers?.players) {
        setPlayers(result.data.topPerformers.players)
      }

    } catch (err: any) {
      console.error('Error loading performance data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!performanceData || !profile) return

    try {
      const exportData = preparePerformanceDataForPDF(
        performanceData,
        profile,
        selectedTimeframe
      )
      
      const exporter = new PDFExporter()
      await exporter.exportAnalytics(exportData)
    } catch (error) {
      console.error('PDF export failed:', error)
      setError('Failed to export PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading performance analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadPerformanceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Role-based Performance Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {profile?.role === 'player' ? 'Your Performance Analytics' : 'Performance Analytics'}
          </h2>
          <p className="text-muted-foreground">
            {profile?.role === 'player' 
              ? 'Track your individual performance and improvement'
              : 'Detailed player and team performance insights'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {performanceData && (
            <Button onClick={handleExportPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
        
        {/* Player Selection for Coaches/Managers/Admins */}
        {['coach', 'manager', 'admin'].includes(profile?.role) && players.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Focus Player</label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Performance Metrics Grid */}
      {performanceData?.playerStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Matches"
            value={performanceData.playerStats.totalMatches}
            icon={<Target className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Avg Kills"
            value={performanceData.playerStats.avgKills}
            icon={<Crosshair className="h-6 w-6" />}
            color="red"
          />
          <MetricCard
            title="Avg Damage"
            value={performanceData.playerStats.avgDamage}
            icon={<Zap className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Avg Placement"
            value={`#${performanceData.playerStats.avgPlacement}`}
            icon={<Trophy className="h-6 w-6" />}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Radar Chart */}
        {performanceData?.radarData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Profile
              </CardTitle>
              <CardDescription>
                Overall performance metrics comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlayerRadarChart data={performanceData.radarData} height={300} />
            </CardContent>
          </Card>
        )}

        {/* Recent Matches Performance */}
        {performanceData?.performanceTrend && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Performance Trend
              </CardTitle>
              <CardDescription>
                Last 10 matches performance evolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KillDistributionChart data={performanceData.performanceTrend} height={300} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Match History */}
      {performanceData?.recentMatches && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Match Details</CardTitle>
            <CardDescription>Performance breakdown for recent matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
                <div>Match</div>
                <div>Kills</div>
                <div>Assists</div>
                <div>Damage</div>
                <div>Placement</div>
                <div>Survival</div>
              </div>
              {performanceData.recentMatches.map((match: any, index: number) => (
                <div key={index} className="grid grid-cols-6 gap-4 text-sm py-2 border-b border-border/50">
                  <div className="font-medium">{match.match}</div>
                  <div className="flex items-center gap-1">
                    <Crosshair className="h-3 w-3 text-red-500" />
                    {match.kills}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    {match.assists}
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    {match.damage}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-purple-500" />
                    #{match.placement}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-green-500" />
                    {match.survival}min
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curated Insights */}
      {Array.isArray(performanceData?.insights) && performanceData.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Insights are generated from the current filters and timeframe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.insights.map((ins: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border" data-category={ins.category}>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">{ins.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{ins.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Team Analytics Section
export function TeamAnalyticsSection({ 
  profile, 
  selectedTimeframe, 
  selectedTeam, 
  selectedMap 
}: AnalyticsSectionProps) {
  const { getToken } = useAuth()
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTeamData()
  }, [profile, selectedTimeframe, selectedTeam, selectedMap])

  const loadTeamData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams({
        type: 'comparison',
        timeframe: selectedTimeframe,
        ...(selectedTeam !== 'all' && { teamId: selectedTeam })
      })

      const response = await fetch(`/api/analytics/performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load team data: ${response.status}`)
      }

      const result = await response.json()
      setTeamData(result.data)

    } catch (err: any) {
      console.error('Error loading team data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportTeamPDF = async () => {
    if (!teamData || !profile) return

    try {
      const exportData = prepareTeamDataForPDF(
        teamData,
        profile,
        selectedTimeframe
      )
      
      const exporter = new PDFExporter()
      await exporter.exportAnalytics(exportData)
    } catch (error) {
      console.error('PDF export failed:', error)
      setError('Failed to export PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading team analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadTeamData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Team Performance Comparison</h2>
          <p className="text-muted-foreground">
            Compare team performance metrics and identify top performers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {teamData && (
            <Button onClick={handleExportTeamPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Top Performers Cards */}
      {teamData?.topPerformers && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Most Kills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{teamData.topPerformers.mostKills?.teamName || 'N/A'}</p>
                  <p className="text-sm opacity-75">
                    {teamData.topPerformers.mostKills?.avgKills || '0'} avg kills
                  </p>
                </div>
                <Crosshair className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Most Damage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{teamData.topPerformers.mostDamage?.teamName || 'N/A'}</p>
                  <p className="text-sm opacity-75">
                    {teamData.topPerformers.mostDamage?.avgDamage || '0'} avg damage
                  </p>
                </div>
                <Zap className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Best Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{teamData.topPerformers.bestWinRate?.teamName || 'N/A'}</p>
                  <p className="text-sm opacity-75">
                    {teamData.topPerformers.bestWinRate?.winRate || '0'}% win rate
                  </p>
                </div>
                <Trophy className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Comparison Chart */}
      {teamData?.teamComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Team Performance Comparison
            </CardTitle>
            <CardDescription>
              Compare key metrics across all teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamComparisonChart data={teamData.teamComparison} height={400} />
          </CardContent>
        </Card>
      )}

      {/* Detailed Team Stats Table */}
      {teamData?.teamComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Team Statistics</CardTitle>
            <CardDescription>Comprehensive team performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
                <div>Team</div>
                <div>Matches</div>
                <div>Avg Kills</div>
                <div>Avg Damage</div>
                <div>Win Rate</div>
                <div>Avg Placement</div>
              </div>
              {teamData.teamComparison.map((team: any, index: number) => (
                <div key={index} className="grid grid-cols-6 gap-4 text-sm py-3 border-b border-border/50">
                  <div className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    {team.teamName}
                  </div>
                  <div>{team.matches}</div>
                  <div className="flex items-center gap-1">
                    <Crosshair className="h-3 w-3 text-red-500" />
                    {team.avgKills}
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    {team.avgDamage}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-green-500" />
                    {team.winRate}%
                  </div>
                  <div>#{team.avgPlacement}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Trend Analytics Section
export function TrendAnalyticsSection({ 
  profile, 
  selectedTimeframe, 
  selectedTeam, 
  selectedMap 
}: AnalyticsSectionProps) {
  const { getToken } = useAuth()
  const [trendData, setTrendData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrendData()
  }, [profile, selectedTimeframe, selectedTeam, selectedMap])

  const loadTrendData = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams({
        type: 'trends',
        timeframe: selectedTimeframe,
        ...(selectedTeam !== 'all' && { teamId: selectedTeam })
      })

      const response = await fetch(`/api/analytics/performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load trend data: ${response.status}`)
      }

      const result = await response.json()
      setTrendData(result.data)

    } catch (err: any) {
      console.error('Error loading trend data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportTrendPDF = async () => {
    if (!trendData || !profile) return

    try {
      const exportData = prepareTrendDataForPDF(
        trendData,
        profile,
        selectedTimeframe
      )
      
      const exporter = new PDFExporter()
      await exporter.exportAnalytics(exportData)
    } catch (error) {
      console.error('PDF export failed:', error)
      setError('Failed to export PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading trend analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadTrendData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Performance Trends & Analysis</h2>
          <p className="text-muted-foreground">
            Historical performance trends and predictive insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {trendData && (
            <Button onClick={handleExportTrendPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Trend Summary Cards */}
      {trendData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Active Days</p>
                  <p className="text-2xl font-bold">{trendData.summary.totalDays}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Best Day</p>
                  <p className="text-lg font-bold">{trendData.summary.bestDay?.date || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    {trendData.summary.bestDay?.avgKills || '0'} avg kills
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Trend</p>
                  <div className="flex items-center gap-1">
                    {trendData.summary.improvements?.kills > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : trendData.summary.improvements?.kills < 0 ? (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-lg font-bold">
                      {Math.abs(trendData.summary.improvements?.kills || 0)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">vs previous period</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Trend Chart */}
      {trendData?.trendData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Evolution Over Time
            </CardTitle>
            <CardDescription>
              Track performance improvements and patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceTrendChart data={trendData.trendData} height={400} />
          </CardContent>
        </Card>
      )}

      {/* Insights and Recommendations */}
      {Array.isArray(trendData?.insights) && trendData.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Insights are generated from the current filters and timeframe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendData.insights.map((ins: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border" data-category={ins.category}>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">{ins.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{ins.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}