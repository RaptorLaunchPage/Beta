"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Clock, Users, Settings } from "lucide-react"
import { format, isToday, isFuture } from "date-fns"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Team {
  id: string
  name: string
  tier: string
}

interface Session {
  id: string
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  team_id: string
  team?: Team
  created_at: string
  session_type: string
  max_participants?: number
  is_mandatory: boolean
}

const SESSION_TYPES = [
  { value: "practice", label: "Practice Session" },
  { value: "scrimmage", label: "Scrimmage" },
  { value: "strategy", label: "Strategy Review" },
  { value: "training", label: "Training" },
  { value: "meeting", label: "Team Meeting" }
]

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
]

export function DailySessionManager() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  const [newSessionData, setNewSessionData] = useState({
    name: "",
    description: "",
    date: new Date(),
    start_time: "",
    end_time: "",
    team_id: "",
    session_type: "practice",
    max_participants: 0,
    is_mandatory: false
  })

  const userRole = profile?.role?.toLowerCase()
  const canManage = ['admin', 'manager', 'coach'].includes(userRole || '')

  useEffect(() => {
    if (canManage) {
      fetchTeams()
      fetchSessions()
    }
  }, [profile, selectedDate])

  const fetchTeams = async () => {
    try {
      const token = await getToken()
      let url = '/api/teams'
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      const teams = Array.isArray(data) ? data : data.teams || []
      
      setTeams(teams)
      if (teams.length > 0 && !newSessionData.team_id) {
        setNewSessionData(prev => ({ ...prev, team_id: teams[0].id }))
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      })
    }
  }

  const fetchSessions = async () => {
    try {
      const token = await getToken()
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      let url = `/api/sessions?date=${dateStr}`
      
      if (userRole === 'coach' && profile?.team_id) {
        url += `&team_id=${profile.team_id}`
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Validate times
      if (newSessionData.start_time >= newSessionData.end_time) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive"
        })
        return
      }

      // Check for conflicts
      const conflictingSessions = sessions.filter(session => {
        const sessionStart = session.start_time
        const sessionEnd = session.end_time
        const newStart = newSessionData.start_time
        const newEnd = newSessionData.end_time
        
        return session.team_id === newSessionData.team_id &&
               ((newStart >= sessionStart && newStart < sessionEnd) ||
                (newEnd > sessionStart && newEnd <= sessionEnd) ||
                (newStart <= sessionStart && newEnd >= sessionEnd))
      })

      if (conflictingSessions.length > 0) {
        toast({
          title: "Error",
          description: "Time slot conflicts with existing session",
          variant: "destructive"
        })
        return
      }

      const token = await getToken()
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newSessionData.name,
          description: newSessionData.description,
          date: format(newSessionData.date, 'yyyy-MM-dd'),
          start_time: newSessionData.start_time,
          end_time: newSessionData.end_time,
          team_id: newSessionData.team_id,
          session_type: newSessionData.session_type,
          max_participants: newSessionData.max_participants || null,
          is_mandatory: newSessionData.is_mandatory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      toast({
        title: "Success",
        description: "Session created successfully"
      })

      // Reset form
      setNewSessionData({
        name: "",
        description: "",
        date: new Date(),
        start_time: "",
        end_time: "",
        team_id: teams[0]?.id || "",
        session_type: "practice",
        max_participants: 0,
        is_mandatory: false
      })

      fetchSessions()
    } catch (error: any) {
      console.error("Error creating session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive"
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return

    try {
      const token = await getToken()
      const response = await fetch(`/api/sessions?id=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete session')
      }

      toast({
        title: "Success",
        description: "Session deleted successfully"
      })

      fetchSessions()
    } catch (error: any) {
      console.error("Error deleting session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete session",
        variant: "destructive"
      })
    }
  }

  const generateDailySessions = async () => {
    try {
      setFormLoading(true)
      const targetDate = format(selectedDate, 'yyyy-MM-dd')
      
      const token = await getToken()
      const response = await fetch('/api/sessions/generate-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: targetDate })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate sessions')
      }

      toast({
        title: "Success",
        description: "Daily practice sessions generated successfully"
      })

      fetchSessions()
    } catch (error: any) {
      console.error("Error generating daily sessions:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate daily sessions",
        variant: "destructive"
      })
    } finally {
      setFormLoading(false)
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-red-500 mb-2">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to manage daily sessions.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="create" className="flex-1 min-w-0 text-xs sm:text-sm">Create Session</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1 min-w-0 text-xs sm:text-sm">Manage Sessions</TabsTrigger>
          <TabsTrigger value="generate" className="flex-1 min-w-0 text-xs sm:text-sm">Auto Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Daily Session
              </CardTitle>
              <CardDescription>
                Create custom practice sessions, scrimmages, or team meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="session-name">Session Name</Label>
                    <Input
                      id="session-name"
                      value={newSessionData.name}
                      onChange={(e) => setNewSessionData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Morning Practice"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-type">Session Type</Label>
                    <Select
                      value={newSessionData.session_type}
                      onValueChange={(value) => setNewSessionData(prev => ({ ...prev, session_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team">Team</Label>
                    <Select
                      value={newSessionData.team_id}
                      onValueChange={(value) => setNewSessionData(prev => ({ ...prev, team_id: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} ({team.tier})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newSessionData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newSessionData.date ? format(newSessionData.date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newSessionData.date}
                          onSelect={(date) => date && setNewSessionData(prev => ({ ...prev, date }))}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Select
                      value={newSessionData.start_time}
                      onValueChange={(value) => setNewSessionData(prev => ({ ...prev, start_time: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Select
                      value={newSessionData.end_time}
                      onValueChange={(value) => setNewSessionData(prev => ({ ...prev, end_time: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-participants">Max Participants (Optional)</Label>
                    <Input
                      id="max-participants"
                      type="number"
                      min="0"
                      value={newSessionData.max_participants}
                      onChange={(e) => setNewSessionData(prev => ({ ...prev, max_participants: Number(e.target.value) }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mandatory"
                      checked={newSessionData.is_mandatory}
                      onChange={(e) => setNewSessionData(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="mandatory">Mandatory Attendance</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newSessionData.description}
                    onChange={(e) => setNewSessionData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Session description, objectives, or notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={formLoading} className="w-full">
                  {formLoading ? "Creating..." : "Create Session"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manage Sessions
              </CardTitle>
              <CardDescription>
                View and manage sessions for selected date
              </CardDescription>
              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Badge variant={isToday(selectedDate) ? "default" : "secondary"}>
                  {isToday(selectedDate) ? "Today" : isFuture(selectedDate) ? "Future" : "Past"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading sessions...</div>
              ) : sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{session.name}</div>
                            {session.description && (
                              <div className="text-sm text-muted-foreground">{session.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{session.team?.name}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {session.start_time} - {session.end_time}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SESSION_TYPES.find(t => t.value === session.session_type)?.label || session.session_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.is_mandatory && (
                            <Badge variant="destructive">Mandatory</Badge>
                          )}
                          {session.max_participants && (
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              Max {session.max_participants}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions scheduled for {format(selectedDate, "PPP")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Auto Generate Daily Sessions
              </CardTitle>
              <CardDescription>
                Automatically generate practice sessions based on team configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Auto Generation Rules:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Creates practice sessions based on team practice configurations</li>
                    <li>• Avoids conflicts with existing sessions</li>
                    <li>• Uses team-specific time preferences when available</li>
                    <li>• Only generates sessions for future dates</li>
                  </ul>
                </div>

                <Button
                  onClick={generateDailySessions}
                  disabled={formLoading || !isFuture(selectedDate) && !isToday(selectedDate)}
                  className="w-full"
                >
                  {formLoading ? "Generating..." : "Generate Daily Sessions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}