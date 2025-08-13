"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import type { Database } from "@/lib/supabase"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type RosterEntry = Database["public"]["Tables"]["rosters"]["Row"] & { user: UserProfile | null }

const IN_GAME_ROLES = ["IGL", "Support", "Scout", "Entry Frag", "Flex", "Sniper", "Lurker"]

export default function RosterPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [editingRosterEntry, setEditingRosterEntry] = useState<RosterEntry | null>(null)
  const [newPlayerUserId, setNewPlayerUserId] = useState<string | null>(null)
  const [newInGameRole, setNewInGameRole] = useState<string>("")
  const [newContactNumber, setNewContactNumber] = useState<string>("")
  const [newDeviceInfo, setNewDeviceInfo] = useState<string>("")

  useEffect(() => {
    fetchTeams()
    fetchAvailablePlayers()
  }, [profile])

  useEffect(() => {
    if (selectedTeamId) {
      fetchRoster(selectedTeamId)
    } else {
      setRoster([])
    }
  }, [selectedTeamId])

  const fetchTeams = async () => {
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      setTeams(Array.isArray(data) ? data : [])
      if (data && data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id) // Auto-select first team
      }
    } catch (error: any) {
      console.error("Error fetching teams:", error)
      toast({ title: "Connection Error", description: error.message || 'Unable to fetch teams', variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoster = async (teamId: string) => {
    setLoading(true)
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch(`/api/rosters?teamId=${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch roster')
      const data = await res.json()
      setRoster(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error fetching roster:", error)
      toast({ title: "Error", description: error.message || "Failed to fetch roster.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePlayers = async () => {
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      const data = res.ok ? await res.json() : []
      const players = (Array.isArray(data) ? data : []).filter((u: any) => u.role === 'player')
      const currentRosterUserIds = new Set(roster.map((entry) => entry.user_id))
      const filteredPlayers = players.filter((player: any) => !currentRosterUserIds.has(player.id))
      setAvailablePlayers(filteredPlayers)
    } catch (error: any) {
      console.error("Error fetching available players:", error)
      toast({ title: "Connection Error", description: 'Unable to fetch player data', variant: "destructive" })
    }
  }

  const handleAddOrUpdateRosterEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeamId) {
      toast({ title: "Error", description: "Please select a team first.", variant: "destructive" })
      return
    }
    setFormLoading(true)
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      if (editingRosterEntry) {
        const res = await fetch('/api/rosters', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: editingRosterEntry.id, in_game_role: newInGameRole, contact_number: newContactNumber, device_info: newDeviceInfo }) })
        if (!res.ok) throw new Error('Failed to update roster entry')
        toast({ title: "Success", description: "Roster entry updated successfully." })
      } else {
        if (!newPlayerUserId) {
          toast({ title: "Error", description: "Please select a player.", variant: "destructive" })
          return
        }
        const res = await fetch('/api/rosters', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ team_id: selectedTeamId, user_id: newPlayerUserId, in_game_role: newInGameRole, contact_number: newContactNumber, device_info: newDeviceInfo }) })
        if (!res.ok) throw new Error('Failed to add player to roster')
        toast({ title: "Success", description: "Player added to roster successfully." })
      }
      resetForm()
      fetchRoster(selectedTeamId)
      fetchAvailablePlayers()
    } catch (error: any) {
      console.error("Error saving roster entry:", error)
      toast({ title: "Error", description: error.message || "Failed to save roster entry.", variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteRosterEntry = async (rosterId: string) => {
    if (!confirm("Are you sure you want to remove this player from the roster?")) {
      return
    }
    setFormLoading(true)
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch(`/api/rosters?id=${rosterId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to remove player')
      toast({ title: "Success", description: "Player removed from roster." })
      if (selectedTeamId) {
        fetchRoster(selectedTeamId)
        fetchAvailablePlayers()
      }
    } catch (error: any) {
      console.error("Error deleting roster entry:", error)
      toast({ title: "Error", description: error.message || "Failed to remove player from roster.", variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  const startEditing = (entry: RosterEntry) => {
    setEditingRosterEntry(entry)
    setNewPlayerUserId(entry.user_id) // This field will be disabled in edit mode
    setNewInGameRole(entry.in_game_role || "")
    setNewContactNumber(entry.contact_number || "")
    setNewDeviceInfo(entry.device_info || "")
  }

  const resetForm = () => {
    setEditingRosterEntry(null)
    setNewPlayerUserId(null)
    setNewInGameRole("")
    setNewContactNumber("")
    setNewDeviceInfo("")
  }

  // Role-based permissions using unified system
  const userRole = profile?.role as UserRole
  const teamPermissions = DashboardPermissions.getDataPermissions(userRole, 'teams')
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  const isAnalyst = profile?.role === "analyst"
  const isCoach = profile?.role === "coach"
  const canManage = teamPermissions.canCreate || teamPermissions.canEdit
  const canEditOwnTeam = userRole === 'coach'
  const canView = teamPermissions.canView
  
  // Check if user has access to roster management
  if (!profile) {
    return <div className="flex items-center justify-center h-64">Loading profile...</div>
  }
  
  if (!canView) {
    return null
  }

  if (loading) {
    return <div>Loading roster...</div>
  }

  // For coach, only show/select their teams
  const visibleTeams = isCoach ? teams.filter(t => t.coach_id === profile.id) : teams
  const selectableTeams = visibleTeams

  // Only allow actions for own team if coach
  const canEditSelectedTeam = canManage || (canEditOwnTeam && selectedTeamId && visibleTeams.some(t => t.id === selectedTeamId))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Team</CardTitle>
          <CardDescription>Choose a team to view and manage its roster.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {selectableTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectableTeams.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No teams available for your role.</p>
          )}
        </CardContent>
      </Card>
      {selectedTeamId && (
        <>
          {canEditSelectedTeam && !isAnalyst && (
            <Card>
              <CardHeader>
                <CardTitle>{editingRosterEntry ? "Edit Roster Entry" : "Add Player to Roster"}</CardTitle>
                <CardDescription>
                  {editingRosterEntry
                    ? `Editing ${editingRosterEntry.user?.name || editingRosterEntry.user?.email}`
                    : "Add a new player to the selected team's roster."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddOrUpdateRosterEntry} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="player">Player</Label>
                    <Select
                      value={newPlayerUserId || ""}
                      onValueChange={setNewPlayerUserId}
                      disabled={!!editingRosterEntry || availablePlayers.length === 0}
                      required={!editingRosterEntry}
                    >
                      <SelectTrigger id="player">
                        <SelectValue placeholder="Select Player" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name || player.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availablePlayers.length === 0 && !editingRosterEntry && (
                      <p className="text-sm text-muted-foreground">No available players to add.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inGameRole">In-Game Role</Label>
                    <Select value={newInGameRole} onValueChange={setNewInGameRole}>
                      <SelectTrigger id="inGameRole">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {IN_GAME_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={newContactNumber}
                      onChange={(e) => setNewContactNumber(e.target.value)}
                      placeholder="e.g., +1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceInfo">Device Information</Label>
                    <Textarea
                      id="deviceInfo"
                      value={newDeviceInfo}
                      onChange={(e) => setNewDeviceInfo(e.target.value)}
                      placeholder="e.g., Mouse: Logitech G Pro, Keyboard: Ducky One 2"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? "Saving..." : editingRosterEntry ? "Update Roster" : "Add Player"}
                    </Button>
                    {editingRosterEntry && (
                      <Button type="button" variant="outline" onClick={resetForm} disabled={formLoading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Current Roster for {teams.find((t) => t.id === selectedTeamId)?.name}</CardTitle>
              <CardDescription>List of players assigned to this team.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>In-Game Role</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Device Info</TableHead>
                    {canEditSelectedTeam && !isAnalyst && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.user?.name || entry.user?.email}</TableCell>
                      <TableCell>{entry.user?.email}</TableCell>
                      <TableCell>{entry.in_game_role || "N/A"}</TableCell>
                      <TableCell>{entry.contact_number || "N/A"}</TableCell>
                      <TableCell>{entry.device_info || "N/A"}</TableCell>
                      {canEditSelectedTeam && !isAnalyst && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEditing(entry)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteRosterEntry(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {roster.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No players in this roster.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
