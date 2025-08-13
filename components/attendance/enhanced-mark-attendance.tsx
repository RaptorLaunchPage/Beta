"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Users, 
  CheckCircle, 
  User,
  Calendar,
  AlertCircle,
  UserCheck,
  UserX,
  Coffee,
  Gamepad2,
  Trophy,
  Target,
  Crown
} from "lucide-react"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

interface PlayerAttendanceState {
  id: string
  name: string
  email: string
  avatar_url?: string
  in_game_role?: string
  status: 'present' | 'absent' | 'late' | 'unset'
}

interface EnhancedMarkAttendanceProps {
  onAttendanceMarked: () => void
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
}

const SESSION_TYPES = [
  { value: "practice", label: "Practice Session", icon: Target, color: "bg-blue-500" },
  { value: "tournament", label: "Scrims/Tournament", icon: Trophy, color: "bg-purple-500" },
  { value: "meeting", label: "Team Meeting", icon: Coffee, color: "bg-green-500" }
]

export function EnhancedMarkAttendance({ onAttendanceMarked, userProfile, teams, users }: EnhancedMarkAttendanceProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sessionType, setSessionType] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [playersAttendance, setPlayersAttendance] = useState<PlayerAttendanceState[]>([])

  // Early return should be after all hooks
  const isPlayer = userProfile?.role === 'player'
  const isCoach = userProfile?.role === 'coach'
  const isAdminOrManager = ['admin', 'manager'].includes(userProfile?.role || '')

  // Get available teams based on role
  const availableTeams = userProfile && (isPlayer || isCoach) 
    ? teams.filter(team => team.id === userProfile.team_id)
    : teams

  // Auto-select user's team if they're a player or coach
  useEffect(() => {
    if (userProfile && (isPlayer || isCoach) && userProfile.team_id && !selectedTeam) {
      setSelectedTeam(userProfile.team_id)
    }
  }, [isPlayer, isCoach, userProfile?.team_id, selectedTeam, userProfile])

  // Initialize player attendance states when team changes
  useEffect(() => {
    if (selectedTeam) {
      // Get players for selected team inside useEffect to avoid dependency issues
      const teamPlayers = users.filter(user => 
        user.team_id === selectedTeam && 
        (user.role === 'player' || user.role === 'coach')
      )
      
      const initialStates: PlayerAttendanceState[] = teamPlayers.map(player => ({
        id: player.id,
        name: player.name || player.email,
        email: player.email,
        avatar_url: player.avatar_url || undefined,
        in_game_role: player.in_game_role || undefined,
        status: 'unset'
      }))
      setPlayersAttendance(initialStates)
    } else {
      setPlayersAttendance([])
    }
  }, [selectedTeam, users])

  if (!userProfile) return null

  const updatePlayerStatus = (playerId: string, status: 'present' | 'absent' | 'late') => {
    setPlayersAttendance(prev => 
      prev.map(player => 
        player.id === playerId ? { ...player, status } : player
      )
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 border-green-300 text-green-800'
      case 'absent': return 'bg-red-100 border-red-300 text-red-800'
      case 'late': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4" />
      case 'absent': return <UserX className="h-4 w-4" />
      case 'late': return <Clock className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const handleSubmit = async () => {
    const markedPlayers = playersAttendance.filter(p => p.status !== 'unset')
    
    if (markedPlayers.length === 0) {
      toast({
        title: "No attendance marked",
        description: "Please mark attendance for at least one player.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      // Ensure date is never null
      const currentDate = selectedDate || new Date().toISOString().split('T')[0]
      
      // Validate required fields
      if (!selectedTeam || !sessionType || !userProfile?.id) {
        throw new Error('Missing required fields: team, session type, or user information')
      }
      
      const attendanceRecords = markedPlayers.map(player => ({
        player_id: player.id,
        team_id: selectedTeam,
        date: currentDate,
        session_time: sessionType,
        status: player.status === 'present' ? 'Present' : 
                player.status === 'late' ? 'Late' : 'Absent',
        marked_by: userProfile.id
      }))

      // Debug logging
      console.log('Attendance records to insert:', attendanceRecords)

      const { error } = await supabase
        .from('attendances')
        .insert(attendanceRecords)

      if (error) throw error

      toast({
        title: "Attendance marked successfully",
        description: `Marked attendance for ${markedPlayers.length} player(s).`
      })

      // Reset form
      setSessionType("")
      setPlayersAttendance(prev => prev.map(p => ({ ...p, status: 'unset' })))
      onAttendanceMarked()

    } catch (error: any) {
      console.error('Error marking attendance:', error)
      toast({
        title: "Error marking attendance",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const presentCount = playersAttendance.filter(p => p.status === 'present').length
  const absentCount = playersAttendance.filter(p => p.status === 'absent').length
  const lateCount = playersAttendance.filter(p => p.status === 'late').length
  const unmarkedCount = playersAttendance.filter(p => p.status === 'unset').length

  return (
    <div className="space-y-6">
      {/* Session Setup */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5" />
            Session Setup
          </CardTitle>
          <CardDescription className="text-white/80">Configure the attendance session details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <Label htmlFor="date" className="text-sm font-medium mb-2 block text-white">Date</Label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="flex h-10 w-full rounded-md border border-white/25 bg-white/8 backdrop-blur-md px-3 py-2 text-sm text-white focus:bg-white/12 focus:border-white/40 focus:outline-none"
              />
            </div>

            {/* Team Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block text-white">Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={isPlayer || isCoach}>
                <SelectTrigger className="bg-white/8 backdrop-blur-md border-white/25 text-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white/20 text-white border-white/30">{team.tier}</Badge>
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Session Type */}
          <div>
            <Label className="text-sm font-medium mb-3 block text-white">Session Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {SESSION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSessionType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all backdrop-blur-sm ${
                    sessionType === type.value
                      ? 'border-primary bg-primary/20 shadow-md'
                      : 'border-white/30 bg-white/5 hover:border-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className={`${type.color} p-2 rounded-md text-white mx-auto mb-2 w-fit`}>
                    <type.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium text-center text-white">{type.label}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Attendance */}
      {selectedTeam && playersAttendance.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mark Attendance
              </div>
              <div className="flex gap-2 text-sm">
                {presentCount > 0 && <Badge className="bg-green-500/20 text-green-100 border-green-500/30">{presentCount} Present</Badge>}
                {lateCount > 0 && <Badge className="bg-amber-500/20 text-amber-100 border-amber-500/30">{lateCount} Late</Badge>}
                {absentCount > 0 && <Badge className="bg-red-500/20 text-red-100 border-red-500/30">{absentCount} Absent</Badge>}
                {unmarkedCount > 0 && <Badge variant="outline" className="bg-white/20 text-white border-white/30">{unmarkedCount} Unmarked</Badge>}
              </div>
            </CardTitle>
            <CardDescription className="text-white/80">
              Click on each player to mark their attendance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playersAttendance.map((player) => (
                <Card 
                  key={player.id} 
                  className={`cursor-pointer transition-all hover:shadow-md bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 border-2`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12 border-2 border-white/30">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-white/20 text-white">
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{player.name}</p>
                        {player.in_game_role && (
                          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                            {player.in_game_role}
                          </Badge>
                        )}
                      </div>
                      {getStatusIcon(player.status)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        size="sm"
                        variant={player.status === 'present' ? 'default' : 'outline'}
                        onClick={() => updatePlayerStatus(player.id, 'present')}
                        className={`text-xs h-8 ${
                          player.status === 'present' 
                            ? 'bg-green-500/80 hover:bg-green-500/90 text-white border-green-500/40' 
                            : 'bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40'
                        }`}
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant={player.status === 'late' ? 'default' : 'outline'}
                        onClick={() => updatePlayerStatus(player.id, 'late')}
                        className={`text-xs h-8 ${
                          player.status === 'late' 
                            ? 'bg-amber-500/80 hover:bg-amber-500/90 text-white border-amber-500/40' 
                            : 'bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40'
                        }`}
                      >
                        Late
                      </Button>
                      <Button
                        size="sm"
                        variant={player.status === 'absent' ? 'default' : 'outline'}
                        onClick={() => updatePlayerStatus(player.id, 'absent')}
                        className={`text-xs h-8 ${
                          player.status === 'absent' 
                            ? 'bg-red-500/80 hover:bg-red-500/90 text-white border-red-500/40' 
                            : 'bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40'
                        }`}
                      >
                        Absent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-white/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlayersAttendance(prev => prev.map(p => ({ ...p, status: 'present' })))}
                className="bg-green-500/20 border-green-500/40 text-green-100 hover:bg-green-500/30 hover:border-green-500/60"
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlayersAttendance(prev => prev.map(p => ({ ...p, status: 'absent' })))}
                className="bg-red-500/20 border-red-500/40 text-red-100 hover:bg-red-500/30 hover:border-red-500/60"
              >
                Mark All Absent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlayersAttendance(prev => prev.map(p => ({ ...p, status: 'unset' })))}
                className="bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
              >
                Clear All
              </Button>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={loading || !sessionType || !selectedTeam || unmarkedCount === playersAttendance.length}
              className="w-full mt-6 bg-primary/80 hover:bg-primary/90 text-white border-primary/40"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Attendance ({playersAttendance.filter(p => p.status !== 'unset').length} players)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedTeam && playersAttendance.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-white/60 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">No Players Found</h3>
            <p className="text-white/80">
              No active players found for the selected team.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}