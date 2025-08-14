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

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

export function PlayerPerformanceSubmit({ onPerformanceAdded }: { onPerformanceAdded: () => void }) {
  const { profile } = useAuth()
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
  })
  const [team, setTeam] = useState<any>(null)
  const [teamSlots, setTeamSlots] = useState<any[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // Move useEffect before conditional returns
  useEffect(() => {
    async function init() {
      if (!profile?.team_id) return
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      // Fetch team via API
      const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const teams = teamsRes.ok ? await teamsRes.json() : []
      setTeam(Array.isArray(teams) && teams.length ? teams[0] : null)
      // Fetch slots via API
      const slotsRes = await fetch(`/api/slots?team_id=${profile.team_id}`, { headers: { Authorization: `Bearer ${token}` } })
      const slots = slotsRes.ok ? await slotsRes.json() : []
      setTeamSlots(Array.isArray(slots) ? slots : (slots.slots || []))
    }
    init()
  }, [profile?.team_id])

  // Defensive: Only allow players with valid profile
  if (!profile || profile.role !== "player") return null
  if (!profile?.id) {
    return <div className="text-center text-red-500 py-8">Your player profile is incomplete. Please contact support.</div>;
  }
  if (!profile?.team_id) {
    return <div className="text-center text-yellow-600 py-8">You are not assigned to a team. Please contact your coach or admin.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLastError(null)
    try {
      // Validate required fields
      if (!profile.id || !profile.team_id) throw new Error("Missing player or team information.")
      if (!formData.match_number || !formData.slot || !formData.map) throw new Error("Please fill all required fields.")
      // Coerce and validate slot
      let slotValue: string | null = null
      if (!formData.slot) throw new Error("Please select a slot.")
      slotValue = formData.slot
      // No number coercion for slot; treat as string (slot ID)
      // Coerce all numeric fields
      const match_number = Number(formData.match_number)
      const placement = formData.placement ? Number(formData.placement) : null
      const kills = formData.kills ? Number(formData.kills) : 0
      const assists = formData.assists ? Number(formData.assists) : 0
      const damage = formData.damage ? Number(formData.damage) : 0
      const survival_time = formData.survival_time ? Number(formData.survival_time) : 0
      // Prepare payload
      const payload = {
        player_id: profile.id,
        team_id: profile.team_id,
        match_number,
        slot: slotValue,
        map: formData.map,
        placement,
        kills,
        assists,
        damage,
        survival_time,
        added_by: profile.id,
      }
      // Debug log
      if (typeof window !== "undefined") {
        const logs = JSON.parse(localStorage.getItem("debug-logs") || "[]")
        logs.push({
          level: "log",
          message: "Submitting performance payload: " + JSON.stringify(payload),
          time: new Date().toISOString(),
        })
        localStorage.setItem("debug-logs", JSON.stringify(logs.slice(-500)))
      }
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to submit performance')
      toast({ title: "Performance Submitted!", description: "Performance recorded successfully" })
      setFormData({ match_number: "", slot: "", map: "", placement: "", kills: "", assists: "", damage: "", survival_time: "" })
      onPerformanceAdded()
    } catch (error: any) {
      setLastError(error.message || "Failed to submit performance data")
      toast({ title: "Error", description: error.message || "Failed to submit performance data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Performance</CardTitle>
        <CardDescription>Record your match statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Player: <span className="font-semibold">{profile.name || profile.email}</span></div>
          <div className="text-sm text-muted-foreground">Team: <span className="font-semibold">{team ? team.name : "Loading..."}</span></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number</Label>
              <Input 
                id="match_number" 
                type="number" 
                value={formData.match_number} 
                onChange={e => setFormData({ ...formData, match_number: e.target.value })} 
                required 
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="slot">Slot</Label>
              <SmartSlotSelector 
                value={formData.slot} 
                onValueChange={(val) => setFormData({ ...formData, slot: val })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="map">Map</Label>
              <Select value={formData.map} onValueChange={val => setFormData({ ...formData, map: val })} required>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select map" />
                </SelectTrigger>
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
                className="min-h-[44px]"
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
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assists">Assists</Label>
              <Input 
                id="assists" 
                type="number" 
                value={formData.assists} 
                onChange={e => setFormData({ ...formData, assists: e.target.value })} 
                className="min-h-[44px]"
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
                className="min-h-[44px]"
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
                className="min-h-[44px]"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || slotsLoading}>{loading ? "Submitting..." : "Submit Performance"}</Button>
          {lastError && <div className="text-red-500 text-sm mt-2">{lastError}</div>}
        </form>
      </CardContent>
    </Card>
  )
}