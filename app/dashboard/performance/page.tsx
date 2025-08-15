"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PerformanceDashboard } from "@/components/performance/performance-dashboard"
import { EnhancedPlayerPerformanceSubmit } from "@/components/performance/enhanced-player-performance-submit"
import { ScrimAttendance } from "@/components/attendance/scrim-attendance"
import { SendToDiscordButton } from "@/components/discord-portal/send-to-discord-button"
import { 
  Target, 
  Plus, 
  Camera, 
  FileText, 
  Gamepad2, 
  Crosshair, 
  Zap, 
  Shield,
  Filter,
  BarChart3,
  RefreshCw,
  Users,
  Trophy,
  Calendar
} from "lucide-react"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

type Performance = Database["public"]["Tables"]["performances"]["Row"] & {
  slot?: {
    id: string
    time_range: string
    date: string
  } | null
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
}
type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function PerformancePage() {
  const { profile, getToken } = useAuth()
  const [performances, setPerformances] = useState<Performance[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all")
  const [selectedMap, setSelectedMap] = useState<string>("all")
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  useEffect(() => {
    if (profile?.id) {
      loadAllData()
    }
  }, [profile?.id])

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // For players, check if they have team assignment
      if (profile?.role === 'player' && !profile?.team_id) {
        setError('You need to be assigned to a team to view performance data. Please contact your manager.')
        setLoading(false)
        return
      }

      await Promise.all([
        fetchPerformances(),
        fetchUsers(),
        fetchTeams()
      ])
      setDataFetched(true)
    } catch (err) {
      console.error('Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance data. Please try refreshing the page.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchPerformances = async () => {
    if (!profile) return

    try {
      const token = await getToken()
      
      const response = await fetch('/api/performances', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setPerformances(data || [])
    } catch (error) {
      console.error("Error fetching performances:", error)
      throw error
    }
  }

  const fetchUsers = async () => {
    try {
      const token = await getToken()
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Users API Error:', response.status, errorText)
        throw new Error(`Users API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  }

  const fetchTeams = async () => {
    try {
      const token = await getToken()
      
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Teams API Error:', response.status, errorText)
        
        // For players, create a fallback team object from their profile
        if (profile?.role === 'player' && profile?.team_id) {
          console.log('Using fallback team data for player')
          // Try to get team name from existing performance data
          const existingTeamName = performances.find(p => p.teams?.id === profile.team_id)?.teams?.name
          setTeams([{ 
            id: profile.team_id, 
            name: existingTeamName || 'My Team',
            tier: null,
            coach_id: null,
            status: 'active',
            created_at: new Date().toISOString()
          }])
          return
        }
        
        throw new Error(`Teams API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
      
      // Final fallback for players - don't throw error, just set empty teams
      if (profile?.role === 'player') {
        console.log('Setting empty teams array for player due to fetch error')
        setTeams([])
        return
      }
      
      throw error
    }
  }

  // Role-based permissions using unified system
  const userRole = profile?.role as UserRole
  const performancePermissions = DashboardPermissions.getDataPermissions(userRole, 'performance')
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)
  
  const isAnalyst = profile?.role === "analyst"
  const canViewDashboard = performancePermissions.canView
  const canUseOCR = performancePermissions.canCreate && ['admin', 'manager', 'coach'].includes(userRole)
  const canSubmitPerformance = userRole === 'player'
  const canStaffSubmit = ['admin', 'manager', 'coach'].includes(userRole)
  const canViewAttendance = ['admin', 'manager', 'coach', 'player'].includes(userRole)

  // Auto-select team for players and reset player filter when team changes
  useEffect(() => {
    if (userRole === 'player' && profile?.team_id && selectedTeam === "all") {
      setSelectedTeam(profile.team_id)
    }
    if (selectedTeam !== "all" && (userRole === 'admin' || userRole === 'manager')) {
      setSelectedPlayer("all")
    }
  }, [selectedTeam, userRole, profile?.team_id])

  // Auto-select player for their own data
  useEffect(() => {
    if (userRole === 'player' && profile?.id && selectedPlayer === "all") {
      setSelectedPlayer(profile.id)
    }
  }, [userRole, profile?.id, selectedPlayer])

  // Enhanced performances with user and team names
  const enhancedPerformances = performances.map(perf => {
    const user = users.find(u => u.id === perf.player_id)
    const team = teams.find(t => t.id === perf.team_id)
    
    return {
      ...perf,
      users: user ? { id: user.id, name: user.name || 'Unknown', email: user.email } : perf.users,
      teams: team ? { id: team.id, name: team.name } : perf.teams
    }
  })

  // Helper function to filter by time period
  const isWithinTimePeriod = (dateString: string) => {
    if (selectedTimePeriod === "all") return true
    
    const date = new Date(dateString)
    const now = new Date()
    
    switch (selectedTimePeriod) {
      case "today":
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        return date >= today && date < tomorrow
        
      case "7days":
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(now.getDate() - 7)
        return date >= sevenDaysAgo
        
      case "30days":
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(now.getDate() - 30)
        return date >= thirtyDaysAgo
        
      case "custom":
        if (!customStartDate && !customEndDate) return true
        const start = customStartDate ? new Date(customStartDate) : new Date(0)
        const end = customEndDate ? new Date(customEndDate) : new Date()
        end.setHours(23, 59, 59, 999) // Include the entire end date
        return date >= start && date <= end
        
      default:
        return true
    }
  }

  // Filter performances based on selected filters and role permissions
  const filteredPerformances = enhancedPerformances.filter(perf => {
    // Role-based access control
    if (userRole === 'player' && perf.player_id !== profile?.id) {
      // Players can only see their own performance data
      return false
    }
    if (userRole === 'coach' && perf.team_id !== profile?.team_id) {
      // Coaches can only see their team's data
      return false
    }
    
    // Apply user-selected filters
    if (selectedTeam !== "all" && perf.team_id !== selectedTeam) return false
    if (selectedPlayer !== "all" && perf.player_id !== selectedPlayer) return false
    if (selectedMap !== "all" && perf.map !== selectedMap) return false
    if (!isWithinTimePeriod(perf.created_at)) return false
    return true
  })

  // Function to get formatted date range for Discord message
  const getDateRangeText = () => {
    switch (selectedTimePeriod) {
      case "today":
        return `Today (${new Date().toLocaleDateString()})`
      case "7days":
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return `Last 7 days (${sevenDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()})`
      case "30days":
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return `Last 30 days (${thirtyDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()})`
      case "custom":
        if (customStartDate && customEndDate) {
          return `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
        } else if (customStartDate) {
          return `From ${new Date(customStartDate).toLocaleDateString()}`
        } else if (customEndDate) {
          return `Until ${new Date(customEndDate).toLocaleDateString()}`
        } else {
          return "Custom range (all data)"
        }
      case "all":
      default:
        return "All time"
    }
  }

  // Calculate stats for filtered performances
  const stats = {
    totalMatches: filteredPerformances.length,
    totalKills: filteredPerformances.reduce((sum, p) => sum + (p.kills || 0), 0),
    avgDamage: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.damage || 0), 0) / filteredPerformances.length : 0,
    avgSurvival: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.survival_time || 0), 0) / filteredPerformances.length : 0,
    avgPlacement: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.placement || 0), 0) / filteredPerformances.length : 0,
    kdRatio: filteredPerformances.length > 0 ? 
      filteredPerformances.reduce((sum, p) => sum + (p.kills || 0), 0) / filteredPerformances.length : 0,
    todayMatches: filteredPerformances.filter(p => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(p.created_at) >= today
    }).length,
    weekMatches: filteredPerformances.filter(p => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(p.created_at) >= weekAgo
    }).length,
    dateRange: getDateRangeText()
  }

  // Role-based filtering logic
  const getAvailableTeams = () => {
    if (userRole === 'admin' || userRole === 'manager') {
      return teams  // Admin/Manager see all teams
    } else if (userRole === 'coach') {
      // Coach sees assigned team(s)
      return teams.filter(team => profile?.team_id === team.id)
    } else {
      // Players see their own team
      return teams.filter(team => profile?.team_id === team.id)
    }
  }

  const getAvailablePlayers = () => {
    if (userRole === 'admin' || userRole === 'manager') {
      // Admin/Manager see all players, filtered by selected team if any
      if (selectedTeam === "all") {
        return users.filter(user => user.role === 'player' || user.role === 'coach')
      } else {
        return users.filter(user => 
          (user.role === 'player' || user.role === 'coach') && 
          user.team_id === selectedTeam
        )
      }
    } else if (userRole === 'coach') {
      // Coach sees players in their assigned team
      return users.filter(user => 
        (user.role === 'player' || user.role === 'coach') && 
        user.team_id === profile?.team_id
      )
    } else {
      // Players see only themselves and their team members
      return users.filter(user => 
        user.id === profile?.id || 
        (user.team_id === profile?.team_id && (user.role === 'player' || user.role === 'coach'))
      )
    }
  }

  const availableTeams = getAvailableTeams()
  const availablePlayers = getAvailablePlayers()
    
  const availableMaps = [...new Set(enhancedPerformances.map(p => p.map).filter(Boolean))]

  const requiresUsers = canViewDashboard || canStaffSubmit || canUseOCR

  // If user has no access to any tab, render nothing
      if (!canViewDashboard && !canStaffSubmit && !canUseOCR && !canSubmitPerformance && !canViewAttendance) {
    return null
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading user profile...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading performance data...</p>
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
              <Target className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {profile?.role === 'player' && !profile?.team_id ? (
              <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="font-medium text-yellow-800">Team Assignment Required</p>
                <p className="mt-1">As a player, you need to be assigned to a team to access performance data.</p>
                <p className="mt-2">Please contact your team manager or administrator for assistance.</p>
              </div>
            ) : (
              <Button onClick={loadAllData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requiresUsers && users.length === 0 && dataFetched) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground mb-4">
              <Users className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
            <p className="text-muted-foreground mb-4">
              No user data is available yet. Please contact your administrator.
            </p>
            <Button onClick={loadAllData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Performance Tracking</h1>
          <p className="text-muted-foreground">Track and analyze match performance data</p>
        </div>

      </div>

      <ResponsiveTabs 
        tabs={[
          {
            value: "dashboard",
            label: "Dashboard",
            icon: BarChart3
          },
          {
            value: "submit",
            label: "Submit Performance",
            icon: Plus,
            hidden: !canSubmitPerformance && !canStaffSubmit
          },
          {
            value: "attendance",
            label: "Match Attendance",
            icon: Calendar,
            hidden: !canViewAttendance
          }
        ].filter(tab => !tab.hidden)}
        defaultValue="dashboard"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="space-y-4"
      >

        <TabsContent value="dashboard" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter performance data by team, player, map, and time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Player</label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Players" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Players</SelectItem>
                      {availablePlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name || player.email}
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
                      {availableMaps.map(map => (
                        <SelectItem key={map} value={map}>
                          {map}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Period</label>
                  <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Range */}
              {selectedTimePeriod === "custom" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards or No Data State */}
          {filteredPerformances.length === 0 && dataFetched ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  <Target className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Performance Data Yet</h3>
                <p className="text-muted-foreground mb-6">
                  {selectedTeam !== "all" || selectedPlayer !== "all" || selectedMap !== "all" 
                    ? "No performances match your current filters. Try adjusting the filters above."
                    : "Start tracking performance by adding your first match data."}
                </p>

              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Matches</p>
                    <p className="text-2xl font-bold">{stats.totalMatches}</p>
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
                    <p className="text-2xl font-bold">{stats.totalKills}</p>
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
                    <p className="text-2xl font-bold">{stats.avgDamage.toFixed(0)}</p>
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
                    <p className="text-2xl font-bold">{stats.kdRatio.toFixed(2)}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Today Matches</p>
                    <p className="text-2xl font-bold">{stats.todayMatches}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">This Week</p>
                    <p className="text-2xl font-bold">{stats.weekMatches}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Avg Survival</p>
                    <p className="text-2xl font-bold">{stats.avgSurvival.toFixed(1)}min</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
          )}  {/* End of stats cards conditional */}

          {/* Send to Discord */}
          {filteredPerformances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Share Performance Report
                  <SendToDiscordButton
                    messageType="performance_summary"
                    data={{
                      team_name: selectedTeam !== 'all' 
                        ? availableTeams.find(t => t.id === selectedTeam)?.name || 'Team'
                        : 'All Teams',
                      player_name: selectedPlayer !== 'all'
                        ? users.find(u => u.id === selectedPlayer)?.name || 'Player'
                        : 'All Players',
                      map_filter: selectedMap !== 'all' ? selectedMap : 'All Maps',
                      date_range: stats.dateRange,
                      period_filter: selectedTimePeriod,
                      total_matches: stats.totalMatches,
                      avg_placement: Math.round(stats.avgPlacement * 100) / 100,
                      avg_damage: Math.round(stats.avgDamage),
                      avg_survival: Math.round(stats.avgSurvival),
                      kd_ratio: Math.round(stats.kdRatio * 100) / 100,
                      top_performer: filteredPerformances.length > 0 ? {
                        name: (() => {
                          const bestKillsPerf = filteredPerformances.reduce((prev, current) => 
                            ((prev.kills || 0) > (current.kills || 0)) ? prev : current
                          )
                          return users.find(u => u.id === bestKillsPerf.player_id)?.name || 'Unknown'
                        })(),
                        kills: Math.max(...filteredPerformances.map(p => p.kills || 0)),
                        damage: Math.max(...filteredPerformances.map(p => p.damage || 0))
                      } : null,
                      summary_stats: {
                        total_kills: stats.totalKills,
                        total_damage: Math.round(stats.avgDamage * stats.totalMatches),
                        best_placement: filteredPerformances.length > 0 ? Math.min(...filteredPerformances.map(p => p.placement || 999)) : null,
                        matches_today: stats.todayMatches,
                        matches_week: stats.weekMatches
                      },
                      filters_applied: {
                        team: selectedTeam !== 'all',
                        player: selectedPlayer !== 'all', 
                        map: selectedMap !== 'all',
                        time_period: selectedTimePeriod !== 'all'
                      }
                    }}
                    teamId={selectedTeam !== 'all' ? selectedTeam : profile?.team_id}
                    variant="outline"
                  />
                </CardTitle>
                <CardDescription>
                  Send current performance summary to Discord
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Performance Data */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>
          ) : filteredPerformances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No performance data found.</div>
          ) : (
            <PerformanceDashboard 
              performances={filteredPerformances} 
              users={users} 
              currentUser={profile}
              showFilters={false}
              compact={false}
            />
          )}
        </TabsContent>

        {(canSubmitPerformance || canStaffSubmit) && (
          <TabsContent value="submit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Submit Performance Data
                </CardTitle>
                <CardDescription>
                  {profile?.role === 'player' 
                    ? 'Submit your match performance statistics'
                    : 'Submit performance data for team members'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile && (() => {
                  try {
                    return <EnhancedPlayerPerformanceSubmit onPerformanceAdded={fetchPerformances} />
                  } catch (err) {
                    return <div className="text-center py-8 text-red-500">An error occurred while loading the performance form. Please contact support.</div>
                  }
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewAttendance && (
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Match Attendance Log
                </CardTitle>
                <CardDescription>
                  View automatically generated attendance records from match performances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrimAttendance />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </ResponsiveTabs>
    </div>
  )
}
