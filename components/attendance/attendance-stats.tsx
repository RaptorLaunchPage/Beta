"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Target,
  Award
} from "lucide-react"
import type { UserRole } from "@/lib/dashboard-permissions"

type Attendance = {
  id: string
  player_id: string
  team_id: string
  date: string
  session_time: string
  status: string
  marked_by: string | null
  created_at: string
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

type Team = {
  id: string
  name: string
  tier: string | null
}

type User = {
  id: string
  name: string | null
  email: string
  team_id: string | null
  role: string | null
}

interface AttendanceStatsProps {
  attendances: Attendance[]
  teams: Team[]
  users: User[]
  userRole: UserRole | undefined
}

export function AttendanceStats({ attendances, teams, users, userRole }: AttendanceStatsProps) {
  const stats = useMemo(() => {
    // Overall Stats
    const totalRecords = attendances.length
    const presentRecords = attendances.filter(a => a.status === 'present' || a.status === 'auto').length
    const overallAttendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0

    // Current month stats
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const currentMonthAttendances = attendances.filter(a => {
      const date = new Date(a.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    const currentMonthPresent = currentMonthAttendances.filter(a => a.status === 'present' || a.status === 'auto').length
    const currentMonthRate = currentMonthAttendances.length > 0 ? (currentMonthPresent / currentMonthAttendances.length) * 100 : 0

    // Session-wise stats
    const sessionStats = {
      Morning: { total: 0, present: 0 },
      Evening: { total: 0, present: 0 },
      Night: { total: 0, present: 0 },
      Match: { total: 0, present: 0 }
    }

    attendances.forEach(a => {
      if (sessionStats[a.session_time as keyof typeof sessionStats]) {
        sessionStats[a.session_time as keyof typeof sessionStats].total++
        if (a.status === 'present' || a.status === 'auto') {
          sessionStats[a.session_time as keyof typeof sessionStats].present++
        }
      }
    })

    // Team-wise stats
    const teamStats = teams.map(team => {
      const teamAttendances = attendances.filter(a => a.team_id === team.id)
      const teamPresent = teamAttendances.filter(a => a.status === 'present' || a.status === 'auto').length
      const teamPlayers = users.filter(u => u.team_id === team.id && u.role === 'player').length
      
      return {
        team,
        total: teamAttendances.length,
        present: teamPresent,
        rate: teamAttendances.length > 0 ? (teamPresent / teamAttendances.length) * 100 : 0,
        playerCount: teamPlayers
      }
    }).filter(stat => stat.total > 0) // Only show teams with attendance records

    // Player-wise stats (top performers)
    const playerStats = users
      .filter(u => u.role === 'player')
      .map(player => {
        const playerAttendances = attendances.filter(a => a.player_id === player.id)
        const playerPresent = playerAttendances.filter(a => a.status === 'present' || a.status === 'auto').length
        
        return {
          player,
          total: playerAttendances.length,
          present: playerPresent,
          rate: playerAttendances.length > 0 ? (playerPresent / playerAttendances.length) * 100 : 0
        }
      })
      .filter(stat => stat.total > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10) // Top 10 players

    // Recent trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    const dailyStats = last7Days.map(date => {
      const dayAttendances = attendances.filter(a => a.date === date)
              const dayPresent = dayAttendances.filter(a => a.status === 'present' || a.status === 'auto').length
      
      return {
        date,
        total: dayAttendances.length,
        present: dayPresent,
        rate: dayAttendances.length > 0 ? (dayPresent / dayAttendances.length) * 100 : 0
      }
    })

    return {
      overall: {
        totalRecords,
        presentRecords,
        overallAttendanceRate,
        currentMonthRate
      },
      sessions: sessionStats,
      teams: teamStats,
      players: playerStats,
      daily: dailyStats
    }
  }, [attendances, teams, users])

  const getSessionIcon = (session: string) => {
    switch (session) {
      case 'Morning': return '🌅'
      case 'Evening': return '🌆'
      case 'Night': return '🌙'
      case 'Match': return '🎮'
      default: return '⏰'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold">{stats.overall.totalRecords}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present Records</p>
                <p className="text-2xl font-bold text-green-600">{stats.overall.presentRecords}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Rate</p>
                <p className="text-2xl font-bold">{stats.overall.overallAttendanceRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold">{stats.overall.currentMonthRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session-wise Attendance
          </CardTitle>
          <CardDescription>
            Attendance rates by session time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.sessions).map(([session, data]) => {
              const rate = data.total > 0 ? (data.present / data.total) * 100 : 0
              return (
                <div key={session} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSessionIcon(session)}</span>
                      <span className="font-medium">{session}</span>
                    </div>
                    <span className="text-sm text-gray-600">{rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={rate} className="h-2" />
                  <p className="text-xs text-gray-500">
                    {data.present}/{data.total} present
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      {stats.teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
            <CardDescription>
              Attendance rates by team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.teams.map((teamStat) => (
                <div key={teamStat.team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{teamStat.team.name}</span>
                      {teamStat.team.tier && (
                        <Badge variant="secondary">{teamStat.team.tier}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{teamStat.present}/{teamStat.total} present</span>
                      <span>{teamStat.playerCount} players</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{teamStat.rate.toFixed(1)}%</div>
                    <Progress value={teamStat.rate} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {stats.players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Players with best attendance rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.players.slice(0, 5).map((playerStat, index) => (
                <div key={playerStat.player.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {playerStat.player.name || playerStat.player.email}
                    </div>
                    <div className="text-sm text-gray-600">
                      {playerStat.present}/{playerStat.total} sessions attended
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {playerStat.rate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Trends (Last 7 Days)
          </CardTitle>
          <CardDescription>
            Daily attendance overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.daily.map((day) => (
                              <div key={day.date} className="flex items-center justify-between p-2 hover:bg-black/20 hover:backdrop-blur-sm rounded">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <Progress value={day.rate} className="w-32 h-2" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{day.rate.toFixed(1)}%</span>
                  <div className="text-xs text-gray-500">{day.present}/{day.total}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}