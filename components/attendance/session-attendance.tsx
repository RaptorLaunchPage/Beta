"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Users, 
  CheckCircle, 
  User,
  Calendar,
  AlertTriangle,
  UserCheck,
  UserX,
  Timer,
  Target,
  Trophy,
  Coffee,
  Play,
  Eye,
  AlertCircle
} from "lucide-react"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

interface Session {
  id: string
  team_id: string
  session_type: 'practice' | 'tournament' | 'meeting'
  session_subtype: string
  date: string
  start_time?: string
  end_time?: string
  cutoff_time?: string
  title?: string
  description?: string
  is_mandatory: boolean
  created_by: string
  teams?: { id: string; name: string }
  attendances?: Attendance[]
}

interface Attendance {
  id: string
  player_id: string
  team_id: string
  session_id: string
  status: 'present' | 'late' | 'absent'
  source: 'manual' | 'auto' | 'system'
  marked_by?: string
  created_at: string
  users?: { id: string; name: string; email: string; avatar_url?: string; in_game_role?: string }
}

interface SessionAttendanceProps {
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
}

const SESSION_ICONS = {
  practice: Target,
  tournament: Trophy,
  meeting: Coffee
}

const SESSION_COLORS = {
  practice: "bg-blue-100 border-blue-300 text-blue-800",
  tournament: "bg-purple-100 border-purple-300 text-purple-800",
  meeting: "bg-green-100 border-green-300 text-green-800"
}

const PRACTICE_SUBTYPES = ['Morning', 'Evening', 'Night']

export function SessionAttendance({ userProfile, teams, users }: SessionAttendanceProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [markingAttendance, setMarkingAttendance] = useState<{ [sessionId: string]: boolean }>({})

  // Move all derived state and hooks before conditional return
  const isPlayer = userProfile?.role === 'player'
  const isCoach = userProfile?.role === 'coach'
  const isAdminOrManager = ['admin', 'manager'].includes(userProfile?.role || '')

  useEffect(() => {
    if (userProfile) {
      loadSessions()
    }
  }, [selectedDate, userProfile])

  if (!userProfile) return null

  const loadSessions = async () => {
    setLoading(true)
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
      if (!token) throw new Error('Authentication required. Please log in again.')

      // Fetch sessions for the selected date
      const sessionsResponse = await fetch(`/api/sessions?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!sessionsResponse.ok) {
        const errorData = await sessionsResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${sessionsResponse.status}`)
      }

      const sessionsData = await sessionsResponse.json()

      // Fetch attendances for these sessions
      const sessionIds = sessionsData.map((s: Session) => s.id)
      if (sessionIds.length > 0) {
        const { data: attendancesData, error: attendanceError } = await supabase
          .from('attendances')
          .select(`
            *,
            users:player_id(id, name, email, avatar_url, in_game_role)
          `)
          .in('session_id', sessionIds)

        if (attendanceError) throw attendanceError

        // Group attendances by session
        const attendancesBySession = attendancesData?.reduce((acc: any, attendance: any) => {
          if (!acc[attendance.session_id]) acc[attendance.session_id] = []
          acc[attendance.session_id].push(attendance)
          return acc
        }, {}) || {}

        // Attach attendances to sessions
        const sessionsWithAttendances = sessionsData.map((session: Session) => ({
          ...session,
          attendances: attendancesBySession[session.id] || []
        }))

        setSessions(sessionsWithAttendances)
      } else {
        setSessions([])
      }

    } catch (error: any) {
      console.error('Error loading sessions:', error)
      toast({
        title: "Error loading sessions",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = async (sessionId: string, status: 'present' | 'late') => {
    if (!isPlayer) return // Only players can mark their own attendance

    setMarkingAttendance(prev => ({ ...prev, [sessionId]: true }))

    try {
      const { error } = await supabase
        .from('attendances')
        .insert({
          player_id: userProfile.id,
          team_id: userProfile.team_id!,
          session_id: sessionId,
          status,
          source: 'manual',
          marked_by: userProfile.id
        })

      if (error) throw error

      toast({
        title: "Attendance marked",
        description: `You have been marked as ${status}.`,
      })

      // Reload sessions to show updated attendance
      await loadSessions()

    } catch (error: any) {
      console.error('Error marking attendance:', error)
      toast({
        title: "Error marking attendance",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    } finally {
      setMarkingAttendance(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  const canMarkAttendance = (session: Session) => {
    if (!isPlayer) return false
    if (session.session_type !== 'practice') return false // Only practice sessions can be marked
    
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    
    // Can only mark attendance for today's sessions
    if (session.date !== today) return false
    
    // Check if cutoff time has passed
    if (session.cutoff_time) {
      const [hours, minutes] = session.cutoff_time.split(':').map(Number)
      const cutoffTime = new Date()
      cutoffTime.setHours(hours, minutes, 0, 0)
      
      if (now > cutoffTime) return false
    }
    
    // Check if already marked
    const existingAttendance = session.attendances?.find(a => a.player_id === userProfile.id)
    return !existingAttendance
  }

  const getPlayerAttendance = (session: Session, playerId: string) => {
    return session.attendances?.find(a => a.player_id === playerId)
  }

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 border-green-300 text-green-800'
      case 'late': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'absent': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-600'
    }
  }

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4" />
      case 'late': return <Timer className="h-4 w-4" />
      case 'absent': return <UserX className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const isCutoffPassed = (session: Session) => {
    if (!session.cutoff_time) return false
    
    const now = new Date()
    const [hours, minutes] = session.cutoff_time.split(':').map(Number)
    const cutoffTime = new Date()
    cutoffTime.setHours(hours, minutes, 0, 0)
    
    return now > cutoffTime
  }

  const teamPlayers = userProfile.team_id 
    ? users.filter(user => user.team_id === userProfile.team_id && user.role === 'player')
    : []

  const practiceSessionsOnly = sessions.filter(s => s.session_type === 'practice')
  const otherSessions = sessions.filter(s => s.session_type !== 'practice')

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Session Attendance
          </CardTitle>
          <CardDescription>
            {isPlayer ? 'Mark your attendance for practice sessions' : 'View team attendance'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="date" className="text-sm font-medium mb-2 block">Select Date</label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Current Time: <span className="font-mono">{getCurrentTime()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sessions...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Practice Sessions (Mandatory for Players) */}
          {practiceSessionsOnly.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Practice Sessions
                  <Badge variant="secondary">Mandatory</Badge>
                </CardTitle>
                <CardDescription>
                  {isPlayer ? 'Mark your attendance before the cutoff time' : 'View practice attendance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {practiceSessionsOnly.map((session) => {
                    const myAttendance = isPlayer ? getPlayerAttendance(session, userProfile.id) : null
                    const canMark = canMarkAttendance(session)
                    const cutoffPassed = isCutoffPassed(session)
                    const isMarking = markingAttendance[session.id]

                    return (
                      <Card 
                        key={session.id} 
                        className={`${myAttendance ? getAttendanceStatusColor(myAttendance.status) : 'border-2'}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              <span className="font-medium">{session.session_subtype}</span>
                            </div>
                            {myAttendance && getAttendanceIcon(myAttendance.status)}
                          </div>

                          {session.cutoff_time && (
                            <div className="flex items-center gap-2 mb-3 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>Cutoff: {session.cutoff_time}</span>
                              {cutoffPassed && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Passed
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Player Actions */}
                          {isPlayer && (
                            <div className="space-y-2">
                              {myAttendance ? (
                                <div className="text-center py-2">
                                  <Badge className={getAttendanceStatusColor(myAttendance.status)}>
                                    {myAttendance.status.charAt(0).toUpperCase() + myAttendance.status.slice(1)}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Marked at {new Date(myAttendance.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              ) : canMark ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => markAttendance(session.id, 'present')}
                                    disabled={isMarking}
                                    className="text-xs"
                                  >
                                    {isMarking ? 'Marking...' : 'Present'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAttendance(session.id, 'late')}
                                    disabled={isMarking}
                                    className="text-xs"
                                  >
                                    {isMarking ? 'Marking...' : 'Late'}
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  {cutoffPassed ? (
                                    <Badge variant="destructive">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Auto Absent
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Already Marked</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Team View for Coaches/Admins */}
                          {!isPlayer && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium">Team Attendance:</div>
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <Badge className="bg-green-100 text-green-800 justify-center">
                                  {session.attendances?.filter(a => a.status === 'present').length || 0} Present
                                </Badge>
                                <Badge className="bg-yellow-100 text-yellow-800 justify-center">
                                  {session.attendances?.filter(a => a.status === 'late').length || 0} Late
                                </Badge>
                                <Badge className="bg-red-100 text-red-800 justify-center">
                                  {session.attendances?.filter(a => a.status === 'absent').length || 0} Absent
                                </Badge>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Sessions (Tournament/Meeting) */}
          {otherSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Scrims & Meeting Sessions
                  <Badge variant="outline">Auto-Tracked</Badge>
                </CardTitle>
                <CardDescription>
                  Scrims attendance auto-tracked from performance data, meetings created by admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {otherSessions.map((session) => {
                    const SessionIcon = SESSION_ICONS[session.session_type]
                    const myAttendance = isPlayer ? getPlayerAttendance(session, userProfile.id) : null
                    const autoAttendances = session.attendances?.filter(a => a.source === 'auto') || []
                    const manualAttendances = session.attendances?.filter(a => a.source === 'manual') || []
                    
                    return (
                      <Card key={session.id} className={`border-2 ${SESSION_COLORS[session.session_type]}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <SessionIcon className="h-6 w-6" />
                              <div>
                                <h4 className="font-medium">{session.title || session.session_subtype}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                                  {session.session_type === 'tournament' && session.session_subtype === 'Scrims' && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Auto from Performance
                                    </span>
                                  )}
                                </p>
                                {session.description && (
                                  <p className="text-sm mt-1">{session.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="mb-1">
                                {session.attendances?.length || 0} total
                              </Badge>
                              {session.session_type === 'tournament' && autoAttendances.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {autoAttendances.length} auto + {manualAttendances.length} manual
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Player's attendance status for this session */}
                          {isPlayer && myAttendance && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <Badge className={getAttendanceStatusColor(myAttendance.status)}>
                                  {getAttendanceIcon(myAttendance.status)}
                                  <span className="ml-1">
                                    {myAttendance.status.charAt(0).toUpperCase() + myAttendance.status.slice(1)}
                                  </span>
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {myAttendance.source === 'auto' ? 'Auto-tracked from performance' : 'Manually marked'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Team attendance breakdown for coaches/admins */}
                          {!isPlayer && session.attendances && session.attendances.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium mb-2">Attendance Breakdown:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>{session.attendances.filter(a => a.status === 'present').length} Present</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>{autoAttendances.length} Auto-tracked</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span>{session.attendances.filter(a => a.status === 'late').length} Late</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  <span>{manualAttendances.length} Manual</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Sessions State */}
          {sessions.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sessions Found</h3>
                <p className="text-muted-foreground">
                  No sessions scheduled for {new Date(selectedDate).toLocaleDateString()}.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}