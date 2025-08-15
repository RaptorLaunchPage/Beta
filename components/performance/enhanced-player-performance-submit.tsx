"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmartSlotSelector } from "./smart-slot-selector"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Clock, Users } from "lucide-react"

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

interface SlotWithMatches {
  id: string
  organizer: string
  time_range: string
  date: string
  match_count: number
  team_id: string
}

interface ExistingPerformance {
  match_number: number
  kills: number
  damage: number
  placement: number
  id: string
}

export function EnhancedPlayerPerformanceSubmit({ onPerformanceAdded }: { onPerformanceAdded: () => void }) {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    match_number: "",
    slot: "",
    map: "",
    placement: "",
    kills: "",
    assists: "",
    damage: "",
    survival_time: "",
    player_id: "", // For staff to select player
    team_id: "", // For staff to select team
  })
  const [team, setTeam] = useState<any>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotWithMatches | null>(null)
  const [availableMatches, setAvailableMatches] = useState<number[]>([])
  const [existingPerformances, setExistingPerformances] = useState<ExistingPerformance[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // For staff members
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const isStaff = profile?.role && ['admin', 'manager', 'coach'].includes(profile.role)
  const isPlayer = profile?.role === 'player'

  // Fetch initial data based on role
  useEffect(() => {
    async function bootstrap() {
      if (!profile) return
      const token = await getToken()
      try {
        if (profile.role === 'player') {
          // Fetch team via API
          const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
          const teams = teamsRes.ok ? await teamsRes.json() : []
          setTeam(Array.isArray(teams) && teams.length ? teams[0] : null)
        } else if (profile.role === 'coach') {
          const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
          const teams = teamsRes.ok ? await teamsRes.json() : []
          setTeams(teams)
          if (profile.team_id) {
            // Players of team
            const playersRes = await fetch(`/api/teams/${profile.team_id}/players`, { headers: { Authorization: `Bearer ${token}` } })
            const players = playersRes.ok ? await playersRes.json() : []
            setPlayers(players)
          }
        } else {
          const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
          const teams = teamsRes.ok ? await teamsRes.json() : []
          setTeams(teams)
        }
      } catch (e) {
        console.warn('Init error:', e)
      }
    }
    bootstrap()
  }, [profile])

  // Fetch players when staff selects a team (admins/managers)
  useEffect(() => {
    const fetchPlayersForTeam = async () => {
      if (!isStaff) return
      if (!formData.team_id) {
        setPlayers([])
        setFormData(prev => ({ ...prev, player_id: "" }))
        return
      }
      // Admin/Manager selecting team should load players of that team
      const { data: playersData } = await supabase
        .from("users")
        .select("*")
        .eq("team_id", formData.team_id)
        .eq("role", "player")
      setPlayers(playersData || [])
      // Reset player if it doesn't belong to selected team
      if (playersData && !playersData.find(p => p.id === formData.player_id)) {
        setFormData(prev => ({ ...prev, player_id: "" }))
      }
    }
    fetchPlayersForTeam()
  }, [formData.team_id, isStaff])

  // Fetch slot details and existing performances when slot or selected player changes
  useEffect(() => {
    const targetPlayerId = isStaff ? formData.player_id : profile?.id

    if (!formData.slot) {
      setSelectedSlot(null)
      setAvailableMatches([])
      setExistingPerformances([])
      return
    }

    if (!targetPlayerId) {
      // Wait until a player is selected for staff
      setExistingPerformances([])
    }

    const fetchSlotDetails = async () => {
      setSlotsLoading(true)
      try {
        // Fetch slot details including match_count
        const { data: slotData, error: slotError } = await supabase
          .from("slots")
          .select("id, organizer, time_range, date, match_count, team_id")
          .eq("id", formData.slot)
          .single()

        if (slotError) throw slotError
        
        setSelectedSlot(slotData)

        // Generate available match numbers based on match_count
        const matches = Array.from({ length: slotData.match_count }, (_, i) => i + 1)
        setAvailableMatches(matches)

        // Fetch existing performances for this slot and player
        if (targetPlayerId) {
          const { data: performanceData, error: performanceError } = await supabase
            .from("performances")
            .select("match_number, kills, damage, placement, id")
            .eq("slot", formData.slot)
            .eq("player_id", targetPlayerId)
            .order("match_number")

          if (performanceError) throw performanceError

          setExistingPerformances(performanceData || [])
        } else {
          setExistingPerformances([])
        }

      } catch (error) {
        console.error('Error fetching slot details:', error)
        toast({ 
          title: "Error", 
          description: "Failed to load slot details", 
          variant: "destructive" 
        })
      } finally {
        setSlotsLoading(false)
      }
    }

    fetchSlotDetails()
  }, [formData.slot, formData.player_id, profile?.id, isStaff])

  // Reset match number when slot changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, match_number: "" }))
  }, [formData.slot])

  // Remove hard block to players only; render based on role and required assignments
  if (!profile) return null

  // Player/Coach assignment checks
  if (profile.role === 'player') {
    if (!profile?.id) {
      return <div className="text-center text-red-500 py-8">Your player profile is incomplete. Please contact support.</div>;
    }
    if (!profile?.team_id) {
      return <div className="text-center text-yellow-600 py-8">You are not assigned to a team. Please contact your coach or admin.</div>;
    }
  }
  if (profile.role === 'coach' && !profile.team_id) {
    return <div className="text-center text-yellow-600 py-8">You are not assigned to a team. Please contact an admin.</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLastError(null)
    
    try {
      // Resolve target player/team per role
      const targetPlayerId = isStaff ? formData.player_id : profile.id
      const targetTeamId = isStaff ? formData.team_id : profile.team_id

      // Validate required fields
      if (!targetPlayerId || !targetTeamId) throw new Error("Missing player or team information.")
      if (!formData.match_number || !formData.slot || !formData.map) throw new Error("Please fill all required fields.")

      // Staff-specific validations
      if (profile.role === 'coach' && targetTeamId !== profile.team_id) {
        throw new Error("Coaches can only submit for their assigned team.")
      }

      const match_number = Number(formData.match_number)
      
      // Check if performance already exists for this match
      const existingMatch = existingPerformances.find(p => p.match_number === match_number)
      if (existingMatch) {
        throw new Error(`Performance data already exists for Match ${match_number}. Please select a different match or edit the existing entry.`)
      }

      // Validate match number is within slot's match count
      if (!selectedSlot || match_number < 1 || match_number > selectedSlot.match_count) {
        throw new Error(`Invalid match number. Please select a match between 1 and ${selectedSlot?.match_count || 0}.`)
      }

      // Coerce all numeric fields
      const placement = formData.placement ? Number(formData.placement) : null
      const kills = formData.kills ? Number(formData.kills) : 0
      const assists = formData.assists ? Number(formData.assists) : 0
      const damage = formData.damage ? Number(formData.damage) : 0
      const survival_time = formData.survival_time ? Number(formData.survival_time) : 0

      // Prepare payload
      const payload = {
        player_id: targetPlayerId,
        team_id: targetTeamId,
        match_number,
        slot: formData.slot,
        map: formData.map,
        placement,
        kills,
        assists,
        damage,
        survival_time,
        added_by: profile.id,
      }

      // Submit performance via API for centralized validation and side effects
      const token = await getToken()
      const response = await fetch('/api/performances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to submit performance')
      }

      toast({ 
        title: "Success!", 
        description: `Performance for Match ${match_number} submitted successfully`,
        variant: "default"
      })

      // Reset form but keep slot selected and for staff keep team and player selections
      setFormData(prev => ({ 
        ...prev, 
        match_number: "", 
        map: "", 
        placement: "", 
        kills: "", 
        assists: "", 
        damage: "", 
        survival_time: "" 
      }))
      
      onPerformanceAdded()

    } catch (error: any) {
      setLastError(error.message || "Failed to submit performance data")
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit performance data", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const getMatchStatus = (matchNumber: number) => {
    const existing = existingPerformances.find(p => p.match_number === matchNumber)
    if (existing) {
      return {
        status: 'completed',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800',
        label: `✓ ${existing.kills}K ${existing.damage}D`
      }
    }
    return {
      status: 'available',
      icon: Clock,
      color: 'bg-blue-100 text-blue-800',
      label: 'Available'
    }
  }

  const getAvailableMatchOptions = () => {
    if (!selectedSlot) return []
    
    return availableMatches.map(matchNum => {
      const existing = existingPerformances.find(p => p.match_number === matchNum)
      const isCompleted = !!existing
      
      return {
        value: matchNum.toString(),
        label: `Match ${matchNum}`,
        disabled: isCompleted,
        subtitle: isCompleted ? `Already submitted (${existing?.kills || 0}K, ${existing?.damage || 0}D)` : 'Available'
      }
    })
  }

  // Helper selections for staff display
  const selectedTeamObj = isStaff && formData.team_id ? teams.find(t => t.id === formData.team_id) : team
  const selectedPlayerObj = isStaff && formData.player_id ? players.find(p => p.id === formData.player_id) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Performance</CardTitle>
        <CardDescription>Record match statistics with smart duplicate prevention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-1">
          <div className="text-sm text-muted-foreground">User: <span className="font-semibold">{profile.name || profile.email}</span></div>
          <div className="text-sm text-muted-foreground">
            {isPlayer ? (
              <>Team: <span className="font-semibold">{team ? team.name : "Loading..."}</span></>
            ) : (
              <>Team: <span className="font-semibold">{selectedTeamObj?.name || (profile.role === 'coach' ? 'Your Team' : 'Not selected')}</span></>
            )}
          </div>
          {isStaff && (
            <div className="text-xs text-muted-foreground">
              {selectedPlayerObj ? `Selected Player: ${selectedPlayerObj.name || selectedPlayerObj.email}` : 'Select a player to enable match status'}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staff controls: team and player selection */}
          {isStaff && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(val) => setFormData({ ...formData, team_id: val })}
                  disabled={profile.role === 'coach'}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={profile.role === 'coach' ? 'Your team' : 'Select team'} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Player</Label>
                <Select
                  value={formData.player_id}
                  onValueChange={(val) => setFormData({ ...formData, player_id: val })}
                  disabled={!formData.team_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.team_id ? 'Select player' : 'Select team first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            <SmartSlotSelector 
              value={formData.slot} 
              onValueChange={(val) => setFormData({ ...formData, slot: val })} 
              required 
              // When staff selects a team, scope slots to that team for better UX
              {...(isStaff && formData.team_id ? { teamId: formData.team_id } : {})}
            />
            
            {selectedSlot && (
              <div className="space-y-2">
                <Label>Slot Details</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">{selectedSlot.organizer}</div>
                  <div className="text-sm text-muted-foreground">{selectedSlot.time_range}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSlot.match_count} matches • {selectedSlot.date}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedSlot && availableMatches.length > 0 && (!isStaff || (isStaff && formData.player_id)) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match_number">Select Match</Label>
                <Select 
                  value={formData.match_number} 
                  onValueChange={val => setFormData({ ...formData, match_number: val })} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select which match to submit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMatchOptions().map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {option.subtitle}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Match Status Overview */}
              <div className="space-y-2">
                <Label>Match Status Overview</Label>
                <div className="flex flex-wrap gap-2">
                  {availableMatches.map(matchNum => {
                    const status = getMatchStatus(matchNum)
                    const StatusIcon = status.icon
                    return (
                      <Badge key={matchNum} className={status.color} variant="secondary">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        Match {matchNum}: {status.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {formData.match_number && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="map">Map</Label>
                <Select value={formData.map} onValueChange={val => setFormData({ ...formData, map: val })} required>
                  <SelectTrigger><SelectValue placeholder="Select map" /></SelectTrigger>
                  <SelectContent>
                    {MAPS.map(map => <SelectItem key={map} value={map}>{map}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="placement">Placement</Label>
                <Input 
                  id="placement" 
                  type="number" 
                  value={formData.placement} 
                  onChange={e => setFormData({ ...formData, placement: e.target.value })} 
                  placeholder="Team placement (1-16)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kills">Kills</Label>
                <Input 
                  id="kills" 
                  type="number" 
                  value={formData.kills} 
                  onChange={e => setFormData({ ...formData, kills: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Assists</Label>
                <Input 
                  id="assists" 
                  type="number" 
                  value={formData.assists} 
                  onChange={e => setFormData({ ...formData, assists: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="damage">Damage</Label>
                <Input 
                  id="damage" 
                  type="number" 
                  value={formData.damage} 
                  onChange={e => setFormData({ ...formData, damage: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survival_time">Survival Time (min)</Label>
                <Input 
                  id="survival_time" 
                  type="number" 
                  value={formData.survival_time} 
                  onChange={e => setFormData({ ...formData, survival_time: e.target.value })} 
                  required 
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={
              loading || slotsLoading || !formData.match_number || !selectedSlot ||
              (isStaff && (!formData.team_id || !formData.player_id))
            }
            className="w-full"
          >
            {loading ? "Submitting..." : `Submit Performance for Match ${formData.match_number || '?'}`}
          </Button>
          
          {lastError && (
            <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded-md">
              {lastError}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}