"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Target, 
  Trophy, 
  Calendar, 
  Clock, 
  Users,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw
} from "lucide-react"

interface ScrimSession {
  id: string
  date: string
  time_range: string
  organizer: string
  match_count: number
  created_at: string
}

interface ScrimAttendance {
  id: string
  player_id: string
  team_id: string
  slot_id: string
  date: string
  status: string
  source: string
  created_at: string
  performance_count?: number
  total_kills?: number
  avg_placement?: number
  total_damage?: number
}

export function ScrimAttendance() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [scrimSessions, setScrimSessions] = useState<ScrimSession[]>([])
  const [scrimAttendances, setScrimAttendances] = useState<ScrimAttendance[]>([])

  useEffect(() => {
    if (profile?.team_id) {
      loadScrimData()
    }
  }, [profile?.team_id])

  // Only allow players to view their own scrim attendance
  if (!profile || profile.role !== 'player') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            This feature is only available for players.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile.team_id) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-yellow-600">
            You need to be assigned to a team to view scrim attendance.
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadScrimData = async () => {
    setLoading(true)
    try {
      if (!profile?.team_id) {
        setScrimSessions([])
        setScrimAttendances([])
        return
      }

      // Get recent slots (scrims) for the team
      const { data: slots, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .eq('team_id', profile.team_id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
        .order('date', { ascending: false })

      if (slotsError) throw slotsError

      setScrimSessions(slots || [])

      // Get attendance records for these slots
      const slotIds = slots?.map(slot => slot.id) || []
      if (slotIds.length > 0) {
        const { data: attendances, error: attendanceError } = await supabase
          .from('attendances')
          .select(`
            *,
            performances:performances!inner(kills, placement, damage)
          `)
          .eq('player_id', profile.id)
          .in('slot_id', slotIds)
          .order('date', { ascending: false })

        if (attendanceError) throw attendanceError

        // Process attendance data with performance statistics
        const processedAttendances = attendances?.map(attendance => {
          const performances = attendance.performances || []
          return {
            ...attendance,
            performance_count: performances.length,
            total_kills: performances.reduce((sum: number, p: any) => sum + (p.kills || 0), 0),
            avg_placement: performances.length > 0 
              ? performances.reduce((sum: number, p: any) => sum + (p.placement || 0), 0) / performances.length 
              : 0,
            total_damage: performances.reduce((sum: number, p: any) => sum + (p.damage || 0), 0)
          }
        }) || []

        setScrimAttendances(processedAttendances)
      }

    } catch (error) {
      console.error('Error loading scrim data:', error)
      // Could add toast notification here if needed
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceStatus = (sessionId: string) => {
    const attendance = scrimAttendances.find(a => a.slot_id === sessionId)
    return attendance || null
  }

  const getStatusBadge = (status: string, source: string) => {
    const isAuto = source === 'auto'
    
    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Present {isAuto && '(Auto)'}
          </Badge>
        )
      case 'absent':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Absent
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            No Data
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Scrim Attendance
              </CardTitle>
              <CardDescription>
                Your attendance is automatically tracked based on performance submissions
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadScrimData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading scrim data...</p>
            </div>
          ) : scrimSessions.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No scrim sessions found for the last 30 days.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scrimSessions.map(session => {
                const attendance = getAttendanceStatus(session.id)
                return (
                  <Card key={session.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Target className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{session.organizer}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(session.date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.time_range}
                              </div>
                              <div className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                {session.match_count} matches
                              </div>
                            </div>
                          </div>
                        </div>
                        {attendance ? 
                          getStatusBadge(attendance.status, attendance.source) :
                          getStatusBadge('absent', 'manual')
                        }
                      </div>

                      {attendance && attendance.status === 'present' && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Performance Summary
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Matches Played</p>
                              <p className="font-semibold">{attendance.performance_count || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Kills</p>
                              <p className="font-semibold">{attendance.total_kills || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg Placement</p>
                              <p className="font-semibold">
                                {attendance.avg_placement ? attendance.avg_placement.toFixed(1) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Damage</p>
                              <p className="font-semibold">
                                {attendance.total_damage ? attendance.total_damage.toLocaleString() : 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How Scrim Attendance Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Attendance is automatically marked when you submit performance data</li>
                <li>• Your attendance status updates in real-time based on match submissions</li>
                <li>• Performance statistics are calculated from your submitted match data</li>
                <li>• No manual attendance marking required for scrims</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}