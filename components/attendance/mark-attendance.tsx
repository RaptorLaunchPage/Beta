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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Users, 
  CheckCircle, 
  User,
  Calendar,
  AlertCircle
} from "lucide-react"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

interface MarkAttendanceProps {
  onAttendanceMarked: () => void
  userProfile: UserProfile | null
  teams: Team[]
  users: UserProfile[]
}

export function MarkAttendance({ onAttendanceMarked, userProfile, teams, users }: MarkAttendanceProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sessionTime, setSessionTime] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Move all derived state and hooks before conditional return
  const isPlayer = userProfile?.role === 'player'
  const isCoach = userProfile?.role === 'coach'
  const isAdminOrManager = ['admin', 'manager'].includes(userProfile?.role || '')

  // Get available teams based on role
  const availableTeams = userProfile && (isPlayer || isCoach) 
    ? teams.filter(team => team.id === userProfile.team_id)
    : teams

  // Get available players based on selected team and role
  const availablePlayers = selectedTeam
    ? users.filter(user => 
        user.team_id === selectedTeam && 
        user.role === 'player' &&
        user.status === 'Active'
      )
    : []

  // Auto-select team for players and coaches
  useEffect(() => {
    if (userProfile && (isPlayer || isCoach) && userProfile.team_id && !selectedTeam) {
      setSelectedTeam(userProfile.team_id)
    }
  }, [userProfile?.team_id, isPlayer, isCoach, selectedTeam, userProfile])

  // Auto-select player for player role
  useEffect(() => {
    if (userProfile && isPlayer && !selectedPlayers.includes(userProfile.id)) {
      setSelectedPlayers([userProfile.id])
    }
  }, [userProfile?.id, isPlayer, selectedPlayers, userProfile])

  if (!userProfile) return null

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    if (isPlayer) return // Players can only mark their own attendance

    if (checked) {
      setSelectedPlayers(prev => [...prev, playerId])
    } else {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId))
    }
  }

  const handleSubmit = async () => {
    if (!sessionTime) {
      toast({
        title: "Error",
        description: "Please select a session time",
        variant: "destructive"
      })
      return
    }

    if (!selectedTeam) {
      toast({
        title: "Error", 
        description: "Please select a team",
        variant: "destructive"
      })
      return
    }

    if (selectedPlayers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one player",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Ensure date is never null
      const currentDate = selectedDate || new Date().toISOString().split('T')[0]
      
      // Validate required fields
      if (!selectedTeam || !sessionTime || !userProfile?.id) {
        throw new Error('Missing required fields: team, session time, or user information')
      }
      
      // Prepare attendance records
      const attendanceRecords = selectedPlayers.map(playerId => ({
        player_id: playerId,
        team_id: selectedTeam,
        date: currentDate,
        session_time: sessionTime,
        status: 'present',
        marked_by: userProfile.id
      }))

      // Insert attendance records
      const { error } = await supabase
        .from("attendances")
        .insert(attendanceRecords)

      if (error) {
        // Handle duplicate entries gracefully
        if (error.code === '23505') {
          toast({
            title: "Warning",
            description: "Some players already have attendance marked for this session",
            variant: "destructive"
          })
        } else {
          throw error
        }
      } else {
        toast({
          title: "Success",
          description: `Attendance marked for ${selectedPlayers.length} player(s)`,
        })

        // Reset form
        setSessionTime("")
        if (!isPlayer && !isCoach) {
          setSelectedTeam("")
        }
        if (!isPlayer) {
          setSelectedPlayers([])
        }
        
        // Refresh attendance data
        onAttendanceMarked()
      }
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Player Self-Mark Card */}
      {isPlayer && (
        <Card className="bg-black/85 backdrop-blur-lg border border-blue-400/60 shadow-2xl text-white rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-200 drop-shadow-md">
              <User className="h-5 w-5 text-blue-400" />
              Mark Your Attendance
            </CardTitle>
            <CardDescription className="text-white/90 drop-shadow-sm">
              Mark your attendance for practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Session Time</Label>
              <RadioGroup value={sessionTime} onValueChange={setSessionTime}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Morning" id="morning" />
                  <Label htmlFor="morning">Morning</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Evening" id="evening" />
                  <Label htmlFor="evening">Evening</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Night" id="night" />
                  <Label htmlFor="night">Night</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Date</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>You can only mark your own attendance</span>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={loading || !sessionTime}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark My Attendance
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Coach/Admin Mark Attendance Card */}
      {(isCoach || isAdminOrManager) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Mark Team Attendance
            </CardTitle>
            <CardDescription>
              Mark attendance for team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Selection (for admins/managers only) */}
            {isAdminOrManager && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                        <Badge variant="secondary" className="ml-2">
                          {team.tier}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Session Time */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Session Time</Label>
              <RadioGroup value={sessionTime} onValueChange={setSessionTime}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Morning" id="team-morning" />
                  <Label htmlFor="team-morning">Morning</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Evening" id="team-evening" />
                  <Label htmlFor="team-evening">Evening</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Night" id="team-night" />
                  <Label htmlFor="team-night">Night</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Date */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Date</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Player Selection */}
            {selectedTeam && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Players ({selectedPlayers.length} selected)
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availablePlayers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          id="select-all"
                          checked={selectedPlayers.length === availablePlayers.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlayers(availablePlayers.map(p => p.id))
                            } else {
                              setSelectedPlayers([])
                            }
                          }}
                        />
                        <Label htmlFor="select-all" className="font-medium">
                          Select All
                        </Label>
                      </div>
                      {availablePlayers.map((player) => (
                        <div key={player.id} className="flex items-center gap-2">
                          <Checkbox
                            id={player.id}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => 
                              handlePlayerSelection(player.id, checked as boolean)
                            }
                          />
                          <Label htmlFor={player.id} className="flex-1">
                            {player.name || player.email}
                            {player.in_game_role && (
                              <Badge variant="outline" className="ml-2">
                                {player.in_game_role}
                              </Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No active players found for this team
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={handleSubmit}
              disabled={loading || !sessionTime || !selectedTeam || selectedPlayers.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Attendance for {selectedPlayers.length} Player(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}