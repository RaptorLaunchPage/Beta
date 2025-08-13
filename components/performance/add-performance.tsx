"use client"

import type React from "react"

import { useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

interface AddPerformanceProps {
  users: UserProfile[]
  onPerformanceAdded: () => void
}

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

export function AddPerformance({ users, onPerformanceAdded }: AddPerformanceProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    player_id: profile?.role === "player" ? profile.id : "",
    match_number: "",
    slot: "",
    map: "",
    placement: "",
    kills: "",
    assists: "",
    damage: "",
    survival_time: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    // Security check: Players can only submit their own stats
    if (profile.role === "player" && formData.player_id !== profile.id) {
      toast({
        title: "Error",
        description: "You can only submit your own performance data",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const selectedPlayer = users.find((u) => u.id === formData.player_id)

      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          player_id: formData.player_id,
          team_id: selectedPlayer?.team_id || null,
          match_number: Number.parseInt(formData.match_number),
          slot: formData.slot || null,
          map: formData.map,
          placement: formData.placement ? Number.parseInt(formData.placement) : null,
          kills: Number.parseInt(formData.kills) || 0,
          assists: Number.parseInt(formData.assists) || 0,
          damage: Number.parseFloat(formData.damage) || 0,
          survival_time: Number.parseFloat(formData.survival_time) || 0,
          added_by: profile.id,
        })
      })

      if (!res.ok) throw new Error('Failed to add performance')

      toast({
        title: "Success",
        description: "Performance data added successfully",
      })

      // Reset form
      setFormData({
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

      onPerformanceAdded()
    } catch (error: any) {
      console.error("Error adding performance:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add performance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Performance Data</CardTitle>
        <CardDescription>Manually enter match performance statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="player">Player</Label>
              {profile?.role === "player" ? (
                <Input
                  value={profile.name || profile.email}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select
                  value={formData.player_id}
                  onValueChange={(value) => setFormData({ ...formData, player_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => {
                        // Admins and managers can see all players
                        if (["admin", "manager"].includes(profile?.role || "")) {
                          return u.role === "player"
                        }
                        // Coaches can only see their team players
                        if (profile?.role === "coach") {
                          return u.role === "player" && u.team_id === profile.team_id
                        }
                        return false
                      })
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number</Label>
              <Input
                id="match_number"
                type="number"
                value={formData.match_number}
                onChange={(e) => setFormData({ ...formData, match_number: e.target.value })}
                placeholder="Enter match number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot">Slot</Label>
              <Input
                id="slot"
                type="number"
                value={formData.slot}
                onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                placeholder="Enter slot number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map">Map</Label>
              <Select value={formData.map} onValueChange={(value) => setFormData({ ...formData, map: value })} required>
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

            <div className="space-y-2">
              <Label htmlFor="placement">Placement</Label>
              <Input
                id="placement"
                type="number"
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                placeholder="Final placement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kills">Kills</Label>
              <Input
                id="kills"
                type="number"
                value={formData.kills}
                onChange={(e) => setFormData({ ...formData, kills: e.target.value })}
                placeholder="Number of kills"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assists">Assists</Label>
              <Input
                id="assists"
                type="number"
                value={formData.assists}
                onChange={(e) => setFormData({ ...formData, assists: e.target.value })}
                placeholder="Number of assists"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="damage">Damage</Label>
              <Input
                id="damage"
                type="number"
                step="0.1"
                value={formData.damage}
                onChange={(e) => setFormData({ ...formData, damage: e.target.value })}
                placeholder="Total damage dealt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="survival_time">Survival Time (minutes)</Label>
              <Input
                id="survival_time"
                type="number"
                step="0.1"
                value={formData.survival_time}
                onChange={(e) => setFormData({ ...formData, survival_time: e.target.value })}
                placeholder="Survival time in minutes"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Performance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
