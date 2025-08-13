"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Save, 
  RotateCcw, 
  Settings, 
  Sun,
  Moon,
  Sunset,
  Bot,
  TrendingUp,
  Users,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Edit
} from "lucide-react"

interface PracticeSessionConfig {
  id: string
  team_id?: string
  session_subtype: 'Morning' | 'Evening' | 'Night'
  start_time: string
  end_time: string
  cutoff_time: string
  is_active: boolean
  created_by: string
  teams?: { name: string } | null
}

interface Team {
  id: string
  name: string
  status: string | null
}

interface PracticeSessionConfigProps {
  userProfile?: any
  teams?: Team[]
}

export function PracticeSessionConfig({ userProfile, teams }: PracticeSessionConfigProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const [configs, setConfigs] = useState<PracticeSessionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState<PracticeSessionConfig | null>(null)
  const [showAIOptimizer, setShowAIOptimizer] = useState(false)
  const [attendanceData, setAttendanceData] = useState<any[]>([])

  // Default session timings
  const defaultTimings = {
    Morning: { start: '06:00', end: '10:00', cutoff: '12:00' },
    Evening: { start: '16:00', end: '20:00', cutoff: '12:00' },
    Night: { start: '21:00', end: '23:59', cutoff: '12:00' }
  }

  useEffect(() => {
    if (userProfile?.id) {
      loadConfigurations()
      loadAttendanceHeatmap()
    }
  }, [userProfile])

  const loadConfigurations = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/sessions/practice-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading practice configurations:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load practice session configurations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceHeatmap = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/sessions/attendance-heatmap', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAttendanceData(data.heatmap || [])
      }
    } catch (error) {
      console.warn('Failed to load attendance heatmap:', error)
    }
  }

  const saveConfiguration = async (config: PracticeSessionConfig) => {
    setSaving(config.id)
    try {
      const token = await getToken()
      const response = await fetch('/api/sessions/practice-config', {
        method: config.id.startsWith('new-') ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...config,
          id: config.id.startsWith('new-') ? undefined : config.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Configuration saved successfully",
        })
        await loadConfigurations()
        setEditingConfig(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setSaving(null)
    }
  }

  const resetToDefaults = async () => {
    setSaving('reset')
    try {
      const token = await getToken()
      const response = await fetch('/api/sessions/practice-config/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Configurations reset to defaults",
        })
        await loadConfigurations()
      } else {
        throw new Error('Failed to reset configurations')
      }
    } catch (error) {
      console.error('Error resetting configurations:', error)
      toast({
        title: "Error",
        description: "Failed to reset configurations",
        variant: "destructive"
      })
    } finally {
      setSaving(null)
    }
  }

  const getSessionIcon = (subtype: string) => {
    switch (subtype) {
      case 'Morning': return <Sun className="h-4 w-4" />
      case 'Evening': return <Sunset className="h-4 w-4" />
      case 'Night': return <Moon className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getSessionColor = (subtype: string) => {
    switch (subtype) {
      case 'Morning': return 'bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 text-white shadow-xl'
      case 'Evening': return 'bg-orange-900/40 backdrop-blur-lg border border-orange-400/60 text-white shadow-xl'
      case 'Night': return 'bg-purple-900/40 backdrop-blur-lg border border-purple-400/60 text-white shadow-xl'
      default: return 'bg-black/85 backdrop-blur-lg border border-white/40 text-white shadow-xl'
    }
  }

  const getAttendanceRate = (teamId: string | null, subtype: string) => {
    const relevantData = attendanceData.filter(d => 
      (teamId ? d.team_id === teamId : d.is_global) && 
      d.session_subtype === subtype
    )
    if (relevantData.length === 0) return 0
    const totalSessions = relevantData.reduce((sum, d) => sum + d.total_sessions, 0)
    const attendedSessions = relevantData.reduce((sum, d) => sum + d.attended_sessions, 0)
    return totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0
  }

  const globalConfigs = configs.filter(c => !c.team_id)
  const teamConfigs = configs.filter(c => c.team_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading practice session configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Practice Session Timing Editor
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure daily practice session timings for teams and global defaults
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAIOptimizer(!showAIOptimizer)}
            variant="outline"
            size="sm"
          >
            <Bot className="h-4 w-4 mr-2" />
            AI Optimizer
          </Button>
          <Button
            onClick={resetToDefaults}
            disabled={saving === 'reset'}
            variant="outline"
            size="sm"
          >
            {saving === 'reset' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* AI Optimizer Panel */}
      {showAIOptimizer && (
        <Card className="bg-black/85 backdrop-blur-lg border border-blue-400/60 shadow-2xl text-white rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-200 drop-shadow-md">
              <Bot className="h-5 w-5" />
              AI-Based Session Optimizer
            </CardTitle>
            <CardDescription className="text-white/90 drop-shadow-sm">
              Analyze attendance patterns and suggest optimal session timings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Morning', 'Evening', 'Night'].map(subtype => {
                  const rate = getAttendanceRate(null, subtype)
                  return (
                    <div key={subtype} className="text-center p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {getSessionIcon(subtype)}
                        <span className="font-medium">{subtype}</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{rate.toFixed(1)}%</p>
                      <p className="text-xs text-blue-700">Average attendance</p>
                    </div>
                  )
                })}
              </div>
              <div className="text-center">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Optimized Timings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Default Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Global Default Timings
          </CardTitle>
          <CardDescription>
            Default practice session timings used when teams don't have custom configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(['Morning', 'Evening', 'Night'] as const).map(subtype => {
              const existingConfig = globalConfigs.find(c => c.session_subtype === subtype)
              const config = existingConfig || {
                id: `new-${subtype}`,
                session_subtype: subtype,
                start_time: defaultTimings[subtype].start,
                end_time: defaultTimings[subtype].end,
                cutoff_time: defaultTimings[subtype].cutoff,
                is_active: true,
                created_by: userProfile?.id
              }
              
              return (
                <div
                  key={subtype}
                  className={`p-4 rounded-lg border ${getSessionColor(subtype)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getSessionIcon(subtype)}
                      <span className="font-medium">{subtype}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) => {
                          const updatedConfig = { ...config, is_active: checked }
                          saveConfiguration(updatedConfig)
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingConfig(config)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session:</span>
                      <span>{config.start_time} - {config.end_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cutoff:</span>
                      <span>{config.cutoff_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Attendance:</span>
                      <span>{getAttendanceRate(null, subtype).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team-Specific Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team-Specific Configurations
          </CardTitle>
          <CardDescription>
            Custom practice session timings for specific teams (overrides global defaults)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teams && teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map(team => {
                const teamConfigsForTeam = teamConfigs.filter(c => c.team_id === team.id)
                return (
                  <div key={team.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{team.name}</h4>
                      <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                        {team.status}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      {(['Morning', 'Evening', 'Night'] as const).map(subtype => {
                        const teamConfig = teamConfigsForTeam.find(c => c.session_subtype === subtype)
                        const globalDefault = globalConfigs.find(c => c.session_subtype === subtype)
                        
                        return (
                          <div
                            key={`${team.id}-${subtype}`}
                            className={`p-3 rounded border ${getSessionColor(subtype)}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                {getSessionIcon(subtype)}
                                <span className="text-sm font-medium">{subtype}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {teamConfig ? (
                                  <Badge variant="outline" className="text-xs">Custom</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                                {(['admin', 'manager', 'coach'].includes(userProfile?.role)) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const configToEdit = teamConfig || {
                                        id: `new-${team.id}-${subtype}`,
                                        team_id: team.id,
                                        session_subtype: subtype,
                                        start_time: globalDefault?.start_time || defaultTimings[subtype].start,
                                        end_time: globalDefault?.end_time || defaultTimings[subtype].end,
                                        cutoff_time: globalDefault?.cutoff_time || defaultTimings[subtype].cutoff,
                                        is_active: true,
                                        created_by: userProfile?.id
                                      }
                                      setEditingConfig(configToEdit)
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-xs space-y-1">
                              <div>
                                {teamConfig?.start_time || globalDefault?.start_time || defaultTimings[subtype].start} - {' '}
                                {teamConfig?.end_time || globalDefault?.end_time || defaultTimings[subtype].end}
                              </div>
                              <div className="text-muted-foreground">
                                Cutoff: {teamConfig?.cutoff_time || globalDefault?.cutoff_time || defaultTimings[subtype].cutoff}
                              </div>
                              <div className="text-muted-foreground">
                                Attendance: {getAttendanceRate(team.id, subtype).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>No teams found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Edit Dialog would go here */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSessionIcon(editingConfig.session_subtype)}
                Edit {editingConfig.session_subtype} Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={editingConfig.start_time}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      start_time: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={editingConfig.end_time}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      end_time: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="cutoff_time">Cutoff Time</Label>
                <Input
                  id="cutoff_time"
                  type="time"
                  value={editingConfig.cutoff_time}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    cutoff_time: e.target.value
                  })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingConfig.is_active}
                  onCheckedChange={(checked) => setEditingConfig({
                    ...editingConfig,
                    is_active: checked
                  })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingConfig(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveConfiguration(editingConfig)}
                  disabled={saving === editingConfig.id}
                >
                  {saving === editingConfig.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}