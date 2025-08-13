"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Gamepad2,
  Camera,
  MessageSquare,
  RefreshCw,
  Eye
} from "lucide-react"

interface PendingAttendance {
  id: string
  player_id: string
  team_id: string
  session_id: string
  date: string
  session_time: string
  status: string
  training_details: {
    mode_played: string
    hours_played: number
    screenshot_shared: boolean
    discord_channel: string
    notes?: string
    verification_status: 'pending' | 'approved' | 'denied'
    manager_notes?: string
  }
  created_at: string
  users: {
    name: string
    email: string
  }
  sessions: {
    title?: string
    session_subtype: string
    date: string
  }
}

export function ManagerVerification() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [pendingAttendances, setPendingAttendances] = useState<PendingAttendance[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [managerNotes, setManagerNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (profile && ['manager', 'coach', 'admin'].includes(profile.role)) {
      loadPendingAttendances()
    }
  }, [profile?.team_id, profile?.role])

  // Only allow managers, coaches, and admins
  if (!profile || !['manager', 'coach', 'admin'].includes(profile.role)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            This feature is only available for managers, coaches, and administrators.
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadPendingAttendances = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/attendances/verification', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load pending attendances')
      }

      const data = await response.json()
      setPendingAttendances(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading pending attendances:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load pending attendances",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (attendanceId: string, action: 'approved' | 'denied') => {
    setProcessingId(attendanceId)
    try {
      const token = await getToken()
      const response = await fetch('/api/attendances/verification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attendance_id: attendanceId,
          action: action,
          manager_notes: managerNotes[attendanceId] || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update attendance verification')
      }

      const result = await response.json()

      toast({
        title: `Attendance ${action}`,
        description: result.message || `Training attendance has been ${action} successfully.`,
        duration: 3000
      })

      // Remove from pending list
      setPendingAttendances(prev => prev.filter(a => a.id !== attendanceId))
      
      // Clear manager notes for this attendance
      setManagerNotes(prev => {
        const updated = { ...prev }
        delete updated[attendanceId]
        return updated
      })

    } catch (error: any) {
      console.error('Error processing verification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to process verification",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Present
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
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
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
                <Eye className="h-5 w-5" />
                Training Attendance Verification
              </CardTitle>
              <CardDescription>
                Review and verify training attendance submissions from players
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPendingAttendances}
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
              <p className="text-muted-foreground">Loading pending verifications...</p>
            </div>
          ) : pendingAttendances.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-muted-foreground">No pending attendance verifications.</p>
              <p className="text-sm text-muted-foreground mt-2">All training attendance has been processed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingAttendances.map(attendance => (
                <Card key={attendance.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <User className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{attendance.users.name || attendance.users.email}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(attendance.sessions.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {attendance.sessions.session_subtype}
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(attendance.training_details.verification_status)}
                    </div>

                    {/* Training Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        Training Details
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Mode Played</p>
                          <p className="font-semibold">{attendance.training_details.mode_played}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hours Played</p>
                          <p className="font-semibold">{attendance.training_details.hours_played}h</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Screenshot</p>
                          <div className="flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            <p className="font-semibold">
                              {attendance.training_details.screenshot_shared ? 'Shared' : 'Not shared'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Discord Channel</p>
                          <p className="font-semibold">{attendance.training_details.discord_channel || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {attendance.training_details.notes && (
                        <div className="mt-3">
                          <p className="text-muted-foreground text-sm">Player Notes:</p>
                          <p className="text-sm bg-white p-2 rounded border">
                            {attendance.training_details.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manager Notes */}
                    <div className="space-y-3">
                      <Label htmlFor={`notes-${attendance.id}`}>Manager Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${attendance.id}`}
                        value={managerNotes[attendance.id] || ''}
                        onChange={(e) => setManagerNotes(prev => ({
                          ...prev,
                          [attendance.id]: e.target.value
                        }))}
                        placeholder="Add any notes about this attendance verification..."
                        rows={2}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={() => handleVerification(attendance.id, 'approved')}
                        disabled={processingId === attendance.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processingId === attendance.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleVerification(attendance.id, 'denied')}
                        disabled={processingId === attendance.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {processingId === attendance.id ? 'Processing...' : 'Deny'}
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Submitted: {new Date(attendance.created_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Verification Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check if screenshots were shared in the mentioned Discord channel</li>
                <li>• Verify the hours played align with the session duration</li>
                <li>• Consider the game mode and whether it matches training requirements</li>
                <li>• Add manager notes to provide feedback to the player</li>
                <li>• Approved attendance will count towards their training record</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}