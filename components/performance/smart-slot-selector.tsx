"use client"

import { useState, useEffect } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { supabase } from '@/lib/supabase'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Search, Archive, Filter } from 'lucide-react'
import { format, isToday, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase'

type Slot = Database["public"]["Tables"]["slots"]["Row"] & { team?: { name: string } }
type Team = Database["public"]["Tables"]["teams"]["Row"]

interface SmartSlotSelectorProps {
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  teamId?: string
}

const TIME_RANGES = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM", 
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
  "5:00 PM - 7:00 PM",
  "7:00 PM - 9:00 PM",
  "9:00 PM - 11:00 PM",
]

export function SmartSlotSelector({ value, onValueChange, required, teamId }: SmartSlotSelectorProps) {
  const { profile, getToken } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [filterMonth, setFilterMonth] = useState<Date | undefined>(new Date())
  
  // Quick add form state
  const [quickAddData, setQuickAddData] = useState({
    organizer: '',
    time_range: '',
    start_time: '',
    end_time: '',
    date: new Date(), // Default to today
    team_id: '',
    slot_rate: 0
  })

  const userRole = profile?.role as UserRole
  const shouldSeeAllData = DashboardPermissions.shouldSeeAllData(userRole)
  const isAdminOrManager = ['admin', 'manager'].includes(userRole)
  const isPlayer = userRole === 'player'

  useEffect(() => {
    fetchSlots()
    if (isAdminOrManager) {
      fetchTeams()
    }
  }, [profile, showArchived, filterMonth, teamId])

  const fetchSlots = async () => {
    try {
      // Prefer API for consistent role filtering and response
      const params = new URLSearchParams()
      if (showArchived && filterMonth) {
        params.set('view', 'archived')
        params.set('month', format(filterMonth, 'yyyy-MM'))
      } else {
        params.set('view', 'current')
      }
      if (teamId && isAdminOrManager) {
        params.set('team_id', teamId)
      }
      const token = await getToken()
      const res = await fetch(`/api/slots?${params.toString()}`, { 
        headers: { 
          'cache-control': 'no-cache',
          'Authorization': `Bearer ${token}`
        } 
      })
      if (!res.ok) throw new Error('Failed to fetch slots')
      const data = await res.json()
      const slotsData: any[] = Array.isArray(data) ? data : (data.slots || [])
      setSlots(slotsData || [])
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      setTeams(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleQuickAdd = async () => {
    try {
      if (!quickAddData.organizer || !quickAddData.time_range || !quickAddData.date || !quickAddData.team_id) {
        return
      }

      const token = await getToken()
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organizer: quickAddData.organizer,
          time_range: quickAddData.time_range,
          date: format(quickAddData.date, 'yyyy-MM-dd'),
          team_id: quickAddData.team_id,
          slot_rate: quickAddData.slot_rate,
          match_count: 0
        })
      })

      if (!res.ok) throw new Error('Failed to create slot')
      const payload = await res.json()
      const newSlot = payload.slot

      // Only present the newly created slot as options and select it
      setSlots([newSlot])
      onValueChange(newSlot.id)
      setShowQuickAdd(false)
      
      // Reset form
      setQuickAddData({
        organizer: '',
        time_range: '',
        start_time: '',
        end_time: '',
        date: new Date(),
        team_id: '',
        slot_rate: 0
      })
    } catch (error) {
      console.error('Error creating slot:', error)
    }
  }

  // Filter slots for search (admin/manager only)
  const filteredSlots = searchTerm
    ? slots.filter(slot => 
        slot.organizer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.time_range?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.team?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.date?.includes(searchTerm)
      )
    : slots

  // For players and coaches with limited slots, use dropdown
  if (!isAdminOrManager || slots.length <= 20) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slot">Slot</Label>
          {isAdminOrManager && (
            <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Quick Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Add Daily Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Organizer</Label>
                    <Input 
                      value={quickAddData.organizer}
                      onChange={(e) => setQuickAddData(prev => ({ ...prev, organizer: e.target.value }))}
                      placeholder="Tournament/League name"
                    />
                  </div>
                  <div>
                    <Label>Custom Time Range</Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <Input
                          type="time"
                          value={quickAddData.start_time}
                          onChange={(e) => {
                            const startTime = e.target.value
                            setQuickAddData(prev => ({ 
                              ...prev, 
                              start_time: startTime,
                              time_range: startTime && prev.end_time ? `${startTime} - ${prev.end_time}` : ""
                            }))
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground pt-5">to</span>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <Input
                          type="time"
                          value={quickAddData.end_time}
                          onChange={(e) => {
                            const endTime = e.target.value
                            setQuickAddData(prev => ({ 
                              ...prev, 
                              end_time: endTime,
                              time_range: prev.start_time && endTime ? `${prev.start_time} - ${endTime}` : ""
                            }))
                          }}
                        />
                      </div>
                    </div>
                    {quickAddData.time_range && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Range: {quickAddData.time_range}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quickAddData.date ? format(quickAddData.date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={quickAddData.date}
                          onSelect={(date) => date && setQuickAddData(prev => ({ ...prev, date }))}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Team</Label>
                    <Select 
                      value={quickAddData.team_id} 
                      onValueChange={(value) => setQuickAddData(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Slot Rate</Label>
                    <Input 
                      type="number"
                      value={quickAddData.slot_rate}
                      onChange={(e) => setQuickAddData(prev => ({ ...prev, slot_rate: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={handleQuickAdd} className="w-full">
                    Create Daily Slot
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Show status for players */}
        {isPlayer && (
          <div className="text-xs text-muted-foreground">
            Showing only today's available slots
          </div>
        )}
        
        {loading ? (
          <Input disabled value="Loading slots..." />
        ) : slots.length > 0 ? (
          <Select value={value} onValueChange={onValueChange} required={required}>
            <SelectTrigger>
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent>
              {slots.map(slot => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.organizer} - {slot.time_range} ({slot.date})
                  {slot.team && ` - ${slot.team.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-red-500 text-sm">
            {isPlayer 
              ? "No slots available for today. Please contact your coach or admin."
              : `No slots available. ${isAdminOrManager ? 'Click Quick Add to create one.' : 'Please contact your coach or admin.'}`
            }
          </div>
        )}
      </div>
    )
  }

  // For admin/manager with many slots, use advanced search interface
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="slot">Slot</Label>
        <div className="flex gap-2">
          {/* Archive toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-1" />
            {showArchived ? "Current" : "Archive"}
          </Button>
          
          <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Quick Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Add Daily Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Organizer</Label>
                  <Input 
                    value={quickAddData.organizer}
                    onChange={(e) => setQuickAddData(prev => ({ ...prev, organizer: e.target.value }))}
                    placeholder="Tournament/League name"
                  />
                </div>
                <div>
                  <Label>Custom Time Range</Label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Start</Label>
                      <Input
                        type="time"
                        value={quickAddData.start_time}
                        onChange={(e) => {
                          const startTime = e.target.value
                          setQuickAddData(prev => ({ 
                            ...prev, 
                            start_time: startTime,
                            time_range: startTime && prev.end_time ? `${startTime} - ${prev.end_time}` : ""
                          }))
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground pt-5">to</span>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <Input
                        type="time"
                        value={quickAddData.end_time}
                        onChange={(e) => {
                          const endTime = e.target.value
                          setQuickAddData(prev => ({ 
                            ...prev, 
                            end_time: endTime,
                            time_range: prev.start_time && endTime ? `${prev.start_time} - ${endTime}` : ""
                          }))
                        }}
                      />
                    </div>
                  </div>
                  {quickAddData.time_range && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Range: {quickAddData.time_range}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {quickAddData.date ? format(quickAddData.date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={quickAddData.date}
                        onSelect={(date) => date && setQuickAddData(prev => ({ ...prev, date }))}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Team</Label>
                  <Select 
                    value={quickAddData.team_id} 
                    onValueChange={(value) => setQuickAddData(prev => ({ ...prev, team_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Slot Rate</Label>
                  <Input 
                    type="number"
                    value={quickAddData.slot_rate}
                    onChange={(e) => setQuickAddData(prev => ({ ...prev, slot_rate: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <Button onClick={handleQuickAdd} className="w-full">
                  Create Daily Slot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Archive month filter */}
      {showArchived && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Label className="text-sm">Filter by month:</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterMonth ? format(filterMonth, "MMMM yyyy") : "Select month"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filterMonth}
                onSelect={setFilterMonth}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search slots by organizer, time, team, or date..."
          className="pl-10"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {showArchived 
          ? `Showing archived slots for ${filterMonth ? format(filterMonth, "MMMM yyyy") : "all time"}`
          : "Showing today's slots only"
        }
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-md">
        {filteredSlots.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredSlots.slice(0, 50).map(slot => (
              <Card 
                key={slot.id} 
                className={cn(
                  "cursor-pointer transition-colors p-2 hover:bg-black/40 hover:backdrop-blur-lg",
                  value === slot.id && "ring-2 ring-blue-400/60 bg-blue-900/40 backdrop-blur-lg border-blue-400/40"
                )}
                onClick={() => onValueChange(slot.id)}
              >
                <div className="text-sm">
                  <div className="font-medium">{slot.organizer}</div>
                  <div className="text-gray-600">
                    {slot.time_range} • {slot.date}
                    {slot.team && ` • ${slot.team.name}`}
                    {!isToday(new Date(slot.date)) && (
                      <span className="ml-2 text-xs bg-gray-600 text-white px-1 rounded">
                        Past
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {filteredSlots.length > 50 && (
              <div className="text-center text-sm text-gray-500 p-2">
                Showing first 50 results. Use search to narrow down.
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No slots match your search.' : showArchived ? 'No archived slots found for selected period.' : 'No slots available for today.'}
          </div>
        )}
      </div>
    </div>
  )
}