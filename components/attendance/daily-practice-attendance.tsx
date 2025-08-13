"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Sun,
  Moon,
  Sunset,
  Users,
  Loader2
} from "lucide-react"

interface DailySession {
  id: string
  session_subtype: string
  start_time: string
  end_time: string
  cutoff_time: string
  title: string
  is_mandatory: boolean
  attendance?: {
    id: string
    status: 'present' | 'late' | 'absent'
    source: 'manual' | 'auto' | 'system'
  } | null
}

interface DailySessionGroup {
  date: string
  sessions: DailySession[]
  isDayMarked: boolean
  markedSession?: string
}

interface DailyPracticeAttendanceProps {
  userProfile?: any
  teams?: any[]
  users?: any[]
}

export function DailyPracticeAttendance({ userProfile, teams, users }: DailyPracticeAttendanceProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const [dailyGroups, setDailyGroups] = useState<DailySessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile?.id) {
      loadDailySessions()
    }
  }, [userProfile])

  const loadDailySessions = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch('/api/sessions/daily-practice', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        processSessionsIntoDaily(data.sessions || [])
        
        // Handle special case where player has no team
        if (data.message) {
          toast({
            title: "Info",
            description: data.message,
            variant: "default"
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading daily sessions:', error)
      toast({
        title: "Error Loading Sessions",
        description: error instanceof Error ? error.message : "Failed to load practice sessions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const processSessionsIntoDaily = (sessions: any[]) => {
    const grouped = sessions.reduce((acc: Record<string, DailySession[]>, session) => {
      const date = session.date
      if (!acc[date]) {
        acc[date] = []
      }
      
      acc[date].push({
        id: session.id,
        session_subtype: session.session_subtype,
        start_time: session.start_time,
        end_time: session.end_time,
        cutoff_time: session.cutoff_time,
        title: session.title || `${session.session_subtype} Practice`,
        is_mandatory: session.is_mandatory,
        attendance: session.attendances?.[0] || null
      })
      
      return acc
    }, {})

    const dailyGroups = Object.entries(grouped).map(([date, sessions]) => {
      const markedAttendances = sessions.filter(s => s.attendance?.status === 'present' || s.attendance?.status === 'late')
      const isDayMarked = markedAttendances.length > 0
      const markedSession = markedAttendances[0]?.session_subtype

      return {
        date,
        sessions: sessions.sort((a, b) => a.start_time.localeCompare(b.start_time)),
        isDayMarked,
        markedSession
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setDailyGroups(dailyGroups)
  }

  const markAttendance = async (sessionId: string, status: 'present' | 'late') => {
    setMarkingAttendance(sessionId)
    try {
      const token = await getToken()
      const response = await fetch('/api/sessions/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          status: status
        })
      })

      if (response.ok) {
        toast({
          title: "Attendance Marked",
          description: `Successfully marked as ${status}`,
        })
        await loadDailySessions() // Reload to get updated state
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark attendance')
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark attendance",
        variant: "destructive"
      })
    } finally {
      setMarkingAttendance(null)
    }
  }

  const getSessionIcon = (subtype: string) => {
    switch (subtype) {
      case 'Morning': return <Sun className="h-4 w-4" />
      case 'Evening': return <Sunset className="h-4 w-4" />
      case 'Night': return <Moon className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getSessionColor = (subtype: string) => {
    switch (subtype) {
      case 'Morning': return 'bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 text-white shadow-xl'
      case 'Evening': return 'bg-orange-900/40 backdrop-blur-lg border border-orange-400/60 text-white shadow-xl'
      case 'Night': return 'bg-purple-900/40 backdrop-blur-lg border border-purple-400/60 text-white shadow-xl'
      default: return 'bg-black/85 backdrop-blur-lg border border-white/40 text-white shadow-xl'
    }
  }

  const isSessionDisabled = (session: DailySession, dayGroup: DailySessionGroup) => {
    // If day is already marked and this session is not the marked one
    if (dayGroup.isDayMarked && session.attendance?.status !== 'present' && session.attendance?.status !== 'late') {
      return true
    }
    
    // If cutoff time has passed and not marked
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const sessionDate = dayGroup.date
    const cutoffTime = session.cutoff_time
    
    if (sessionDate === today) {
      const currentTime = now.toTimeString().split(' ')[0]
      return currentTime > cutoffTime && !session.attendance
    }
    
    return false
  }

  const canMarkAttendance = (session: DailySession, dayGroup: DailySessionGroup) => {
    // Players can only mark their own attendance
    if (userProfile?.role === 'player') {
      return !isSessionDisabled(session, dayGroup) && !session.attendance
    }
    
    // Coaches/Managers/Admins can mark for others
    return ['coach', 'manager', 'admin'].includes(userProfile?.role)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading practice sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daily Practice Attendance</h3>
          <p className="text-sm text-muted-foreground">
            Mark attendance for any one practice session per day to be counted present
          </p>
        </div>
        <Button 
          onClick={loadDailySessions} 
          variant="outline" 
          size="sm"
          className="bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Attendance Rules Info */}
      <Card className="bg-black/85 backdrop-blur-lg border border-blue-400/60 shadow-2xl text-white rounded-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-200 drop-shadow-md">Daily Practice Rules:</p>
              <ul className="mt-1 space-y-1 text-white/90 drop-shadow-sm">
                <li>• Mark attendance for <strong className="text-white font-semibold">any one session</strong> per day to be counted present</li>
                <li>• Once marked, other sessions for the day are disabled</li>
                <li>• Attendance must be marked before cutoff time (usually 12:00 PM)</li>
                <li>• Practice sessions are mandatory for all players</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Session Groups */}
      <div className="space-y-4">
        {dailyGroups.map((dayGroup) => (
          <Card key={dayGroup.date} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    {new Date(dayGroup.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                </div>
                {dayGroup.isDayMarked ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Present via {dayGroup.markedSession}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Marked
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {dayGroup.sessions.map((session) => {
                  const isDisabled = isSessionDisabled(session, dayGroup)
                  const canMark = canMarkAttendance(session, dayGroup)
                  const isMarked = session.attendance?.status === 'present' || session.attendance?.status === 'late'
                  
                  return (
                    <div
                      key={session.id}
                      className={`relative p-4 rounded-lg border ${getSessionColor(session.session_subtype)} ${
                        isDisabled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSessionIcon(session.session_subtype)}
                          <span className="font-medium">{session.session_subtype}</span>
                        </div>
                        {isMarked && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {session.attendance?.status}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <p>{session.start_time} - {session.end_time}</p>
                        <p>Cutoff: {session.cutoff_time}</p>
                      </div>

                      {canMark && !isMarked && !isDisabled && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => markAttendance(session.id, 'present')}
                            disabled={markingAttendance === session.id}
                            size="sm"
                            className="flex-1 bg-green-500/80 hover:bg-green-500/90 text-white border-green-500/40"
                          >
                            {markingAttendance === session.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Present
                          </Button>
                          {/* Late marking only available during/after session time */}
                          <Button
                            onClick={() => markAttendance(session.id, 'late')}
                            disabled={markingAttendance === session.id}
                            size="sm"
                            variant="outline"
                            className="bg-amber-500/20 border-amber-500/40 text-amber-100 hover:bg-amber-500/30 hover:border-amber-500/60"
                          >
                            Late
                          </Button>
                        </div>
                      )}

                      {isDisabled && dayGroup.isDayMarked && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          ✅ You're already marked present today via {dayGroup.markedSession} session
                        </div>
                      )}

                      {isDisabled && !dayGroup.isDayMarked && (
                        <div className="text-xs text-red-600 text-center py-2">
                          ⏰ Cutoff time passed - automatically marked absent
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dailyGroups.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Practice Sessions</h3>
            <p className="text-muted-foreground">
              No practice sessions have been generated yet. Sessions are automatically created daily.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}