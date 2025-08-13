"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Target, 
  Users, 
  User, 
  Gamepad2,
  Loader2,
  Trophy,
  Crosshair,
  Shield,
  Clock
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Team {
  id: string
  name: string
  tier: string
  status: string
}

interface Player {
  id: string
  name: string
  email: string
  team_id: string
  role: string
  status: string
  in_game_role?: string
}

interface Slot {
  id: string
  time_range: string
  date: string
  team_id: string
}

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

interface StreamlinedPerformanceSubmitProps {
  onPerformanceAdded: () => void
}

export function StreamlinedPerformanceSubmit({ onPerformanceAdded }: StreamlinedPerformanceSubmitProps) {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const [formData, setFormData] = useState({
    team_id: "",
    player_id: "",
    match_number: "",
    slot: "",
    map: "",
    placement: "",
    kills: "",
    assists: "",
    damage: "",
    survival_time: "",
  })

  const userRole = profile?.role?.toLowerCase()

  // Permission checks
  const canAccess = ['admin', 'manager', 'coach'].includes(userRole || '')
  const isAdmin = userRole === 'admin'
  const isManager = userRole === 'manager'
  const isCoach = userRole === 'coach'

  useEffect(() => {
    if (canAccess) {
      loadTeams()
    }
  }, [profile, canAccess])

  useEffect(() => {
    if (formData.team_id) {
      loadPlayers(formData.team_id)
      loadSlots(formData.team_id)
    } else {
      setPlayers([])
      setSlots([])
      setFormData(prev => ({ ...prev, player_id: "", slot: "" }))
    }
  }, [formData.team_id])

  // Access control for non-authorized roles
  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Please log in to access performance submission.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            This feature is only available for coaches, managers, and administrators.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Team assignment requirement (only for coaches)
  if (isCoach && !profile.team_id) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-yellow-600">
            You need to be assigned to a team to submit performance data.
          </div>
        </CardContent>
      </Card>
    )
  }

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load teams')
      }

      const data = await response.json()
      const teamsList = Array.isArray(data) ? data : data.teams || []
      
      // Filter teams based on role
      let filteredTeams = teamsList
      if (isCoach && profile.team_id) {
        filteredTeams = teamsList.filter((team: any) => team.id === profile.team_id)
        // Auto-select coach's team
        setFormData(prev => ({ ...prev, team_id: profile.team_id }))
      }

      setTeams(filteredTeams)
    } catch (error) {
      console.error('Error loading teams:', error)
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      })
    } finally {
      setLoadingTeams(false)
    }
  }

  const loadPlayers = async (teamId: string) => {
    setLoadingPlayers(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/teams/${teamId}/players`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load players')
      }

      const data = await response.json()
      const playersList = Array.isArray(data) ? data : data.players || []
      
      // Filter for active players only
      const activePlayers = playersList.filter((player: any) => 
        player.role === 'player' && player.status === 'Active'
      )

      setPlayers(activePlayers)
    } catch (error) {
      console.error('Error loading players:', error)
      toast({
        title: "Error",
        description: "Failed to load team players",
        variant: "destructive"
      })
    } finally {
      setLoadingPlayers(false)
    }
  }

  const loadSlots = async (teamId: string) => {
    setLoadingSlots(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/slots?team_id=${teamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load slots')
      }

      const data = await response.json()
      const slotsList: any[] = Array.isArray(data) ? data : (data.slots || [])
      setSlots(slotsList)
    } catch (error) {
      console.error('Error loading slots:', error)
      // Don't show error for slots as they might not exist
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.team_id || !formData.player_id || !formData.match_number || !formData.map) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/performances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          player_id: formData.player_id,
          team_id: formData.team_id,
          match_number: parseInt(formData.match_number),
          slot: formData.slot || null,
          map: formData.map,
          placement: formData.placement ? parseInt(formData.placement) : null,
          kills: parseInt(formData.kills) || 0,
          assists: parseInt(formData.assists) || 0,
          damage: parseFloat(formData.damage) || 0,
          survival_time: parseFloat(formData.survival_time) || 0,
          added_by: profile.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit performance')
      }

      toast({
        title: "Success",
        description: "Performance data submitted successfully",
      })

      // Reset form (keep team selection for convenience)
      setFormData(prev => ({
        ...prev,
        player_id: "",
        match_number: "",
        slot: "",
        map: "",
        placement: "",
        kills: "",
        assists: "",
        damage: "",
        survival_time: "",
      }))

      onPerformanceAdded()
    } catch (error) {
      console.error('Error submitting performance:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit performance data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedPlayer = players.find(p => p.id === formData.player_id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Submit Performance Data
        </CardTitle>
        <CardDescription>
          Submit performance data for team players
          {isCoach && " (your team only)"}
          {(isAdmin || isManager) && " (any team)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team *
            </Label>
            <Select
              value={formData.team_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
              disabled={isCoach || loadingTeams}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team"} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.tier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Player Selection */}
          <div className="space-y-2">
            <Label htmlFor="player" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Player *
            </Label>
            <Select
              value={formData.player_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, player_id: value }))}
              disabled={!formData.team_id || loadingPlayers}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.team_id ? "Select team first" :
                  loadingPlayers ? "Loading players..." : 
                  "Select player"
                } />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <span>{player.name}</span>
                      {player.in_game_role && (
                        <Badge variant="outline" className="text-xs">
                          {player.in_game_role}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlayer && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedPlayer.name} ({selectedPlayer.email})
              </p>
            )}
          </div>

          {/* Match Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number *</Label>
              <Input
                id="match_number"
                type="number"
                min="1"
                value={formData.match_number}
                onChange={(e) => setFormData(prev => ({ ...prev, match_number: e.target.value }))}
                placeholder="Enter match number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Map *
              </Label>
              <Select
                value={formData.map}
                onValueChange={(value) => setFormData(prev => ({ ...prev, map: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select map" />
                </SelectTrigger>
                <SelectContent>
                  {MAPS.map((map) => (
                    <SelectItem key={map} value={map}>
                      {map}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Slot Selection (Optional) */}
          {slots.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="slot" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Slot (Optional)
              </Label>
              <Select
                value={formData.slot}
                onValueChange={(value) => setFormData(prev => ({ ...prev, slot: value }))}
                disabled={loadingSlots}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSlots ? "Loading slots..." : "Select slot (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific slot</SelectItem>
                  {slots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.time_range} - {slot.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="placement" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Placement
              </Label>
              <Input
                id="placement"
                type="number"
                min="1"
                max="100"
                value={formData.placement}
                onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value }))}
                placeholder="Rank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kills" className="flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Kills
              </Label>
              <Input
                id="kills"
                type="number"
                min="0"
                value={formData.kills}
                onChange={(e) => setFormData(prev => ({ ...prev, kills: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assists" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Assists
              </Label>
              <Input
                id="assists"
                type="number"
                min="0"
                value={formData.assists}
                onChange={(e) => setFormData(prev => ({ ...prev, assists: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="damage">Damage</Label>
              <Input
                id="damage"
                type="number"
                min="0"
                step="0.1"
                value={formData.damage}
                onChange={(e) => setFormData(prev => ({ ...prev, damage: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="survival_time">Survival Time (minutes)</Label>
            <Input
              id="survival_time"
              type="number"
              min="0"
              step="0.1"
              value={formData.survival_time}
              onChange={(e) => setFormData(prev => ({ ...prev, survival_time: e.target.value }))}
              placeholder="0"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Performance"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}