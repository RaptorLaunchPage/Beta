"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrainingSessionAttendance } from "@/components/attendance/training-session-attendance"
import { ScrimAttendance } from "@/components/attendance/scrim-attendance"
import { ManagerVerification } from "@/components/attendance/manager-verification"
import { SessionAttendance } from "@/components/attendance/session-attendance"
import { AttendanceLogs } from "@/components/attendance/attendance-logs"
import { AttendanceStats } from "@/components/attendance/attendance-stats"
import { SendToDiscordButton } from "@/components/discord-portal/send-to-discord-button"
import { 
  CalendarCheck, 
  Plus, 
  Clock, 
  Users, 
  Filter,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  Eye
} from "lucide-react"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import { DailyPracticeAttendance } from "@/components/attendance/daily-practice-attendance"
import { PracticeSessionConfig } from "@/components/attendance/practice-session-config"
import { DailySessionManager } from "@/components/attendance/daily-session-manager"

type Attendance = Database["public"]["Tables"]["attendances"]["Row"] & {
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
  marked_by_user?: {
    id: string
    name: string
    email: string
  } | null
}

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function AttendancePage() {
  const { profile } = useAuth()
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedSession, setSelectedSession] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("daily")

  useEffect(() => {
    if (profile) {
      loadAllData()
    }
  }, [profile])

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchAttendances(),
        fetchUsers(),
        fetchTeams()
      ])
      setDataFetched(true)
    } catch (err) {
      console.error('Error loading attendance data:', err)
      setError('Failed to load attendance data. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendances = async () => {
    if (!profile) return

    try {
      let query = supabase
        .from("attendances")
        .select(`
          *,
          users!player_id(id, name, email),
          teams!inner(id, name),
          marked_by_user:users!marked_by(id, name, email)
        `)

      // Apply role-based filtering
      if (profile.role === "player") {
        query = query.eq("player_id", profile.id)
      } else if (profile.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      // Admin, manager, and analyst can see all attendances (no filtering)

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setAttendances(data || [])
    } catch (error) {
      console.error("Error fetching attendances:", error)
      throw error
    }
  }

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from("users")
        .select("*")

      // Apply role-based filtering for users
      if (profile?.role === "coach" && profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      } else if (profile?.role === "player") {
        query = query.eq("id", profile.id)
      }

      const { data, error } = await query.order("name")
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchTeams = async () => {
    try {
      let query = supabase
        .from("teams")
        .select("*")

      // Apply role-based filtering for teams
      if (profile?.role === "coach" && profile.team_id) {
        query = query.eq("id", profile.team_id)
      } else if (profile?.role === "player" && profile.team_id) {
        query = query.eq("id", profile.team_id)
      }

      const { data, error } = await query.order("name")
      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  // Filter attendances based on selected filters
  const filteredAttendances = attendances.filter(attendance => {
    if (selectedTeam !== "all" && attendance.team_id !== selectedTeam) return false
    if (selectedSession !== "all" && attendance.session_time !== selectedSession) return false
    if (selectedDate && attendance.date !== selectedDate) return false
    return true
  })

  // Permission checks
  const userRole = profile?.role as UserRole
  const canMarkAttendance = userRole && ['admin', 'manager', 'coach', 'player'].includes(userRole)
  const canViewAllTeams = userRole && ['admin', 'manager'].includes(userRole)

  // Get quick stats
  const todayAttendances = attendances.filter(a => a.date === new Date().toISOString().split('T')[0])
  const presentToday = todayAttendances.filter(a => a.status === 'present' || a.status === 'auto').length
  const totalPlayersToday = todayAttendances.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <CalendarCheck className="h-8 w-8 text-white" />
              Attendance Management
            </h1>
            <p className="text-white/80 mt-1">
              Track practice sessions and match attendance
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <Card className="px-4 py-2 bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-sm text-white/80">Present Today</p>
                  <p className="font-semibold text-white">{presentToday}/{totalPlayersToday}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {canViewAllTeams && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-white">Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block text-white">Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <SelectItem value="all">All Sessions</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                    <SelectItem value="Match">Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-white">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-white/25 bg-white/8 backdrop-blur-md px-3 py-2 text-sm text-white placeholder:text-white/50 focus:bg-white/12 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTeam("all")
                    setSelectedSession("all")
                    setSelectedDate("")
                  }}
                  className="w-full bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <ResponsiveTabs 
          tabs={[
            ...(profile?.role === 'player' ? [
              {
                value: "training",
                label: "Training",
                icon: Plus
              },
              {
                value: "scrim",
                label: "Scrim",
                icon: Target
              }
            ] : []),
            ...((['manager', 'coach', 'admin'].includes(userRole)) ? [{
              value: "verification",
              label: "Verification",
              icon: Eye
            }] : []),
            {
              value: "daily",
              label: "Daily Practice",
              icon: CalendarCheck
            },
            {
              value: "sessions",
              label: "All Sessions",
              icon: Clock
            },
            {
              value: "logs",
              label: "Attendance Logs",
              icon: Calendar
            },
            {
              value: "stats",
              label: "Statistics",
              icon: Users
            },
            ...((['admin', 'manager', 'coach'].includes(userRole)) ? [{
              value: "manage-sessions",
              label: "Manage Sessions",
              icon: Plus
            }] : []),
            ...((['admin', 'manager'].includes(userRole)) ? [{
              value: "config",
              label: "Session Config",
              icon: Filter
            }] : [])
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
          defaultValue={profile?.role === 'player' ? "training" : "daily"}
          variant="default"
          size="sm"
          responsiveMode="dropdown"
          className="space-y-6"
        >

          {profile?.role === 'player' && (
            <>
              <TabsContent value="training">
                <TrainingSessionAttendance />
              </TabsContent>

              <TabsContent value="scrim">
                <ScrimAttendance />
              </TabsContent>
            </>
          )}

          {(['manager', 'coach', 'admin'].includes(userRole)) && (
            <TabsContent value="verification">
              <ManagerVerification />
            </TabsContent>
          )}

          <TabsContent value="daily">
            <DailyPracticeAttendance 
              userProfile={profile}
              teams={teams}
              users={users}
            />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionAttendance 
              userProfile={profile}
              teams={teams}
              users={users}
            />
          </TabsContent>



          <TabsContent value="logs">
            <AttendanceLogs 
              attendances={filteredAttendances}
              onRefresh={fetchAttendances}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <AttendanceStats 
                attendances={attendances}
                teams={teams}
                users={users}
                userRole={userRole}
              />
              
              {/* Send to Discord */}
              {filteredAttendances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Share Attendance Report
                      <SendToDiscordButton
                        messageType="attendance_summary"
                        data={{
                          team_name: selectedTeam !== 'all' 
                            ? teams.find(t => t.id === selectedTeam)?.name || 'Team'
                            : 'All Teams',
                          date_range: selectedDate || 'All time',
                          total_sessions: filteredAttendances.length,
                                  present_count: filteredAttendances.filter(a => a.status === 'present').length,
        absent_count: filteredAttendances.filter(a => a.status === 'absent').length,
        attendance_rate: filteredAttendances.length > 0 
          ? (filteredAttendances.filter(a => a.status === 'present').length / filteredAttendances.length) * 100
          : 0,
                          top_attendees: users
                            .map(user => {
                              const userAttendances = filteredAttendances.filter(a => a.player_id === user.id)
                                              const presentCount = userAttendances.filter(a => a.status === 'present').length
                return {
                  name: user.name || user.email,
                  percentage: userAttendances.length > 0 ? (presentCount / userAttendances.length) * 100 : 0
                              }
                            })
                            .filter(u => u.percentage > 0)
                            .sort((a, b) => b.percentage - a.percentage)
                            .slice(0, 5)
                        }}
                        teamId={selectedTeam !== 'all' ? selectedTeam : profile?.team_id}
                        variant="outline"
                      />
                    </CardTitle>
                    <CardDescription>
                      Send current attendance summary to Discord
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </TabsContent>

          {(['admin', 'manager', 'coach'].includes(userRole)) && (
            <TabsContent value="manage-sessions">
              <DailySessionManager />
            </TabsContent>
          )}

          {['admin', 'manager', 'coach'].includes(userRole) && (
            <TabsContent value="config">
              <PracticeSessionConfig 
                userProfile={profile}
                teams={teams}
              />
            </TabsContent>
          )}
        </ResponsiveTabs>
      </div>
    </div>
  )
}