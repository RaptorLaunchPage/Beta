"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar, 
  Clock, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Gamepad2,
  Users
} from "lucide-react"

interface TrainingSession {
  id: string
  date: string
  session_subtype: string
  start_time: string
  end_time: string
  title?: string
  description?: string
}

interface AttendanceSubmission {
  session_id: string
  status: 'present' | 'absent'
  mode_played: string
  hours_played: number
  screenshot_shared: boolean
  discord_channel: string
  notes?: string
}

export function TrainingSessionAttendance() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [formData, setFormData] = useState<AttendanceSubmission>({
    session_id: "",
    status: 'present',
    mode_played: "",
    hours_played: 0,
    screenshot_shared: false,
    discord_channel: "",
    notes: ""
  })
  const [existingAttendance, setExistingAttendance] = useState<any>(null)

  useEffect(() => {
    if (profile?.team_id) {
      loadTrainingSessions()
    }
  }, [profile?.team_id])

  useEffect(() => {
    if (selectedSession) {
      checkExistingAttendance(selectedSession)
      setFormData(prev => ({ ...prev, session_id: selectedSession }))
    }
  }, [selectedSession])

  // Only allow players
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
            You need to be assigned to a team to mark training attendance.
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadTrainingSessions = async () => {
    try {
      if (!profile?.team_id) {
        setSessions([])
        return
      }

      // Get practice sessions for the current week
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('session_type', 'practice')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading training sessions:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load training sessions",
        variant: "destructive"
      })
    }
  }

  const checkExistingAttendance = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('session_id', sessionId)
        .eq('player_id', profile.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setExistingAttendance(data)
    } catch (error) {
      console.error('Error checking existing attendance:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSession) {
      toast({
        title: "Error",
        description: "Please select a training session",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const session = sessions.find(s => s.id === selectedSession)
      if (!session) throw new Error("Session not found")

      const attendanceData = {
        player_id: profile.id,
        team_id: profile.team_id,
        session_id: selectedSession,
        date: session.date,
        session_time: session.session_subtype,
        status: formData.status,
        source: 'manual',
        marked_by: profile.id,
        // Store additional training data in a JSON field or separate table
        training_details: {
          mode_played: formData.mode_played,
          hours_played: formData.hours_played,
          screenshot_shared: formData.screenshot_shared,
          discord_channel: formData.discord_channel,
          notes: formData.notes,
          verification_status: 'pending'
        }
      }

      const { error } = await supabase
        .from('attendances')
        .upsert(attendanceData)

      if (error) throw error

      toast({
        title: "Attendance Submitted!",
        description: "Your training attendance is pending verification from your manager.",
        duration: 5000
      })

      // Reset form
      setFormData({
        session_id: "",
        status: 'present',
        mode_played: "",
        hours_played: 0,
        screenshot_shared: false,
        discord_channel: "",
        notes: ""
      })
      setSelectedSession("")
      
    } catch (error: any) {
      console.error('Error submitting attendance:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit attendance",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getVerificationBadge = (attendance: any) => {
    if (!attendance?.training_details?.verification_status) return null
    
    const status = attendance.training_details.verification_status
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      denied: "bg-red-100 text-red-800"
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Training Session Attendance
          </CardTitle>
          <CardDescription>
            Mark your attendance for training sessions. Include details about your practice for manager verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Selection */}
            <div className="space-y-2">
              <Label htmlFor="session">Select Training Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a training session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.date).toLocaleDateString()} - {session.session_subtype}
                        <Clock className="h-4 w-4 ml-2" />
                        {session.start_time} - {session.end_time}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSession && (
              <>
                {/* Attendance Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Attendance Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: 'present' | 'absent') => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Present
                        </div>
                      </SelectItem>
                      <SelectItem value="absent">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          Absent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === 'present' && (
                  <>
                    {/* Mode Played */}
                    <div className="space-y-2">
                      <Label htmlFor="mode">Mode Played</Label>
                      <Select 
                        value={formData.mode_played} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ ...prev, mode_played: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select game mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="ranked">Ranked</SelectItem>
                          <SelectItem value="arena">Arena</SelectItem>
                          <SelectItem value="tdm">Team Deathmatch</SelectItem>
                          <SelectItem value="custom">Custom Room</SelectItem>
                          <SelectItem value="scrimmage">Scrimmage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hours Played */}
                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours Played</Label>
                      <Input
                        id="hours"
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={formData.hours_played}
                        onChange={(e) => 
                          setFormData(prev => ({ ...prev, hours_played: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="e.g., 2.5"
                        required
                      />
                    </div>

                    {/* Screenshot Shared */}
                    <div className="space-y-2">
                      <Label>Screenshot Shared on Discord</Label>
                      <Select 
                        value={formData.screenshot_shared.toString()} 
                        onValueChange={(value) => 
                          setFormData(prev => ({ ...prev, screenshot_shared: value === 'true' }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">
                            <div className="flex items-center gap-2">
                              <Camera className="h-4 w-4 text-green-500" />
                              Yes, screenshot shared
                            </div>
                          </SelectItem>
                          <SelectItem value="false">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              No screenshot shared
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Discord Channel */}
                    <div className="space-y-2">
                      <Label htmlFor="discord">Discord Channel</Label>
                      <Input
                        id="discord"
                        value={formData.discord_channel}
                        onChange={(e) => 
                          setFormData(prev => ({ ...prev, discord_channel: e.target.value }))
                        }
                        placeholder="e.g., #practice-screenshots"
                        required={formData.screenshot_shared}
                      />
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => 
                          setFormData(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Any additional details about your training session..."
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Submitting..." : "Submit Attendance"}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Existing Attendance */}
      {existingAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Attendance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(existingAttendance.status)}
                <div>
                  <p className="font-medium">
                    Status: {existingAttendance.status.charAt(0).toUpperCase() + existingAttendance.status.slice(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(existingAttendance.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {getVerificationBadge(existingAttendance)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}