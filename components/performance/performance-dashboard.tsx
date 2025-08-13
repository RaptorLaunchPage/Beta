"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Database } from "@/lib/supabase"

type Performance = Database["public"]["Tables"]["performances"]["Row"] & {
  slot?: {
    id: string
    time_range: string
    date: string
  } | null
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
}
type UserProfile = Database["public"]["Tables"]["users"]["Row"]

interface PerformanceDashboardProps {
  performances: Performance[]
  users: UserProfile[]
  currentUser: UserProfile | null
  showFilters?: boolean
  compact?: boolean
}

export function PerformanceDashboard({ 
  performances, 
  users, 
  currentUser, 
  showFilters = true,
  compact = false
}: PerformanceDashboardProps) {
  // Move all hooks before conditional return
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all")
  const [selectedMap, setSelectedMap] = useState<string>("all")

  const filteredPerformances = useMemo(() => {
    if (!showFilters || !performances) return performances || []
    
    return performances.filter((perf) => {
      if (selectedPlayer !== "all" && perf.player_id !== selectedPlayer) return false
      if (selectedMap !== "all" && perf.map !== selectedMap) return false
      return true
    })
  }, [performances, selectedPlayer, selectedMap, showFilters])

  const stats = useMemo(() => {
    if (filteredPerformances.length === 0) {
      return {
        totalMatches: 0,
        totalKills: 0,
        avgDamage: 0,
        avgSurvival: 0,
        kdRatio: 0,
        avgPlacement: 0,
        todayMatches: 0,
        weekMatches: 0
      }
    }

    const totalMatches = filteredPerformances.length
    const totalKills = filteredPerformances.reduce((sum, perf) => sum + (perf.kills || 0), 0)
    const totalDamage = filteredPerformances.reduce((sum, perf) => sum + (perf.damage || 0), 0)
    const totalSurvival = filteredPerformances.reduce((sum, perf) => sum + (perf.survival_time || 0), 0)
    const totalPlacement = filteredPerformances.reduce((sum, perf) => sum + (perf.placement || 0), 0)

    const avgDamage = totalMatches > 0 ? totalDamage / totalMatches : 0
    const avgSurvival = totalMatches > 0 ? totalSurvival / totalMatches : 0
    const kdRatio = totalMatches > 0 ? totalKills / totalMatches : 0
    const avgPlacement = totalMatches > 0 ? totalPlacement / totalMatches : 0

    // Calculate today's and week's matches
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const todayMatches = filteredPerformances.filter(p => new Date(p.created_at) >= today).length
    const weekMatches = filteredPerformances.filter(p => new Date(p.created_at) >= weekAgo).length

    return {
      totalMatches,
      totalKills,
      avgDamage,
      avgSurvival,
      kdRatio,
      avgPlacement: Math.round(avgPlacement),
      todayMatches,
      weekMatches
    }
  }, [filteredPerformances])

  const uniquePlayers = useMemo(() => {
    const playerMap = new Map()
    filteredPerformances.forEach(perf => {
      if (perf.users && !playerMap.has(perf.player_id)) {
        playerMap.set(perf.player_id, {
          id: perf.player_id,
          name: perf.users.name || perf.users.email
        })
      }
    })
    return Array.from(playerMap.values())
  }, [filteredPerformances])

  const uniqueMaps = useMemo(() => {
    const maps = new Set(filteredPerformances.map(perf => perf.map).filter(Boolean))
    return Array.from(maps)
  }, [filteredPerformances])

  // Conditional return after all hooks
  if (!performances || performances.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No performance data found for the selected filters.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMatches}</div>
            <div className="text-sm text-muted-foreground">Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalKills}</div>
            <div className="text-sm text-muted-foreground">Kills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgDamage.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Avg Damage</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.kdRatio.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">K/D Ratio</div>
          </div>
        </div>

        {/* Recent Matches Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Map</TableHead>
                <TableHead>Kills</TableHead>
                <TableHead>Damage</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerformances.slice(0, 5).map((performance) => (
                <TableRow key={performance.id}>
                  <TableCell className="font-medium">
                    {performance.users?.name || performance.users?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>{performance.map}</TableCell>
                  <TableCell>{performance.kills}</TableCell>
                  <TableCell>{performance.damage}</TableCell>
                  <TableCell>
                    <Badge variant={performance.placement && performance.placement <= 3 ? "default" : "secondary"}>
                      #{performance.placement || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(performance.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {uniquePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={selectedMap} onValueChange={setSelectedMap}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by map" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Maps</SelectItem>
                {uniqueMaps.map((map) => (
                  <SelectItem key={map} value={map}>
                    {map}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              Today: {stats.todayMatches} | Week: {stats.weekMatches}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKills}</div>
            <p className="text-xs text-muted-foreground">
              Avg per match: {stats.totalMatches > 0 ? (stats.totalKills / stats.totalMatches).toFixed(1) : '0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Damage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDamage.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Per match average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">K/D Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.kdRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg Placement: #{stats.avgPlacement}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
          <CardDescription>
            Showing {filteredPerformances.length} match{filteredPerformances.length !== 1 ? 'es' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Map</TableHead>
                  <TableHead>Kills</TableHead>
                  <TableHead>Damage</TableHead>
                  <TableHead>Survival</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPerformances.map((performance) => (
                  <TableRow key={performance.id}>
                    <TableCell className="font-medium">
                      {performance.users?.name || performance.users?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {performance.teams?.name || 'Unknown Team'}
                    </TableCell>
                    <TableCell>{performance.map}</TableCell>
                    <TableCell>{performance.kills}</TableCell>
                    <TableCell>{performance.damage}</TableCell>
                    <TableCell>{performance.survival_time}min</TableCell>
                    <TableCell>
                      <Badge variant={performance.placement && performance.placement <= 3 ? "default" : "secondary"}>
                        #{performance.placement || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(performance.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
