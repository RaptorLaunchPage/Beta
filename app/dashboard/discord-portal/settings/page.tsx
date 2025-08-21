"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import { Settings, Save, AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AutomationSetting { setting_key: string; setting_value: boolean; team_id?: string }
interface TeamOption { id: string; name: string }

const AUTOMATION_SETTINGS = [
  { key: 'auto_slot_create', label: 'Slot Creation', description: 'Send notifications when new slots are created' },
  { key: 'auto_roster_update', label: 'Roster Updates', description: 'Send notifications when team rosters change' },
  { key: 'auto_performance_alerts', label: 'Performance Alerts', description: 'Send performance summary notifications' },
  { key: 'auto_attendance_alerts', label: 'Attendance Alerts', description: 'Send attendance summary notifications' },
  { key: 'auto_daily_summary', label: 'Daily Summary', description: 'Send daily activity summaries' },
  { key: 'auto_weekly_digest', label: 'Weekly Digest', description: 'Send weekly performance digests' },
  { key: 'auto_system_alerts', label: 'System Alerts', description: 'Send important system notifications' },
  { key: 'auto_data_cleanup', label: 'Data Cleanup', description: 'Send notifications about data maintenance' }
]

export default function DiscordSettingsPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(null)
  const [isGlobalContext, setIsGlobalContext] = useState<boolean>(false)
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([])

  const userRole = profile?.role as UserRole
  const permissions = DashboardPermissions.getPermissions(userRole)

  useEffect(() => {
    if (profile && permissions.manageDiscordPortal) {
      resolveContextAndFetch()
    }
  }, [profile, permissions.manageDiscordPortal])

  async function resolveContextAndFetch() {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) { toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' }); return }

      if (userRole === 'admin') {
        setIsGlobalContext(true)
        setResolvedTeamId(null)
        await fetchSettings({ token, isGlobal: true })
        // Also fetch teams for quick switching
        const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
        const teamsData = teamsRes.ok ? await teamsRes.json() : []
        setAvailableTeams(Array.isArray(teamsData) ? teamsData : [])
        return
      }

      if (profile?.team_id) {
        setIsGlobalContext(false)
        setResolvedTeamId(profile.team_id)
        await fetchSettings({ token, teamId: profile.team_id })
        return
      }

      const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const teamsData = teamsRes.ok ? await teamsRes.json() : []
      const teams: TeamOption[] = Array.isArray(teamsData) ? teamsData : []
      setAvailableTeams(teams)
      if (teams.length > 0) {
        setIsGlobalContext(false)
        setResolvedTeamId(teams[0].id)
        await fetchSettings({ token, teamId: teams[0].id })
      } else {
        setIsGlobalContext(false)
        setResolvedTeamId(null)
        setSettings({})
      }
    } catch (error) {
      console.error('Failed resolving settings context:', error)
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async ({ token, teamId, isGlobal = false }: { token: string, teamId?: string, isGlobal?: boolean }) => {
    try {
      const params = new URLSearchParams()
      if (isGlobal) params.append('global', 'true')
      if (teamId) params.append('teamId', teamId)
      const response = await fetch(`/api/discord-portal/settings${params.toString() ? `?${params}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.settings) ? data.settings : []
        const settingsMap: Record<string, boolean> = {}
        list.forEach((setting: AutomationSetting) => { settingsMap[setting.setting_key] = setting.setting_value })
        setSettings(settingsMap)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to load automation settings', variant: 'destructive' })
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    try {
      setSaving(true)
      const token = await getToken()
      const response = await fetch('/api/discord-portal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ settingKey: key, enabled: value, teamId: isGlobalContext ? undefined : resolvedTeamId || undefined, isGlobal: isGlobalContext })
      })
      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast({ title: 'Success', description: 'Automation setting updated' })
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast({ title: 'Error', description: 'Failed to update automation setting', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!permissions.manageDiscordPortal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">You don't have permission to manage Discord Portal settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Settings</h3>
            <p className="text-gray-600">Fetching automation preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discord Portal Settings</h1>
          <p className="text-muted-foreground">Configure automation settings for Discord notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">Automation</span>
        </div>
      </div>

      {/* Scope Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scope</span>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Context</Label>
              <Select value={isGlobalContext ? 'global' : (resolvedTeamId || 'none')} onValueChange={async (v) => {
                const token = await getToken()
                if (v === 'global') {
                  setIsGlobalContext(true)
                  setResolvedTeamId(null)
                  await fetchSettings({ token, isGlobal: true })
                } else {
                  setIsGlobalContext(false)
                  setResolvedTeamId(v)
                  await fetchSettings({ token, teamId: v })
                }
              }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select context" />
                </SelectTrigger>
                <SelectContent>
                  {userRole === 'admin' && <SelectItem value="global">Global (Admin)</SelectItem>}
                  {availableTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
          <CardDescription>Choose whether to edit global or team-specific automation.</CardDescription>
        </CardHeader>
      </Card>

      {/* Automation Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Automation</CardTitle>
          <CardDescription>Enable or disable automations for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUTOMATION_SETTINGS.map(s => (
              <div key={s.key} className="flex items-center justify-between p-3 rounded border">
                <div className="space-y-1">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
                <Switch checked={!!settings[s.key]} disabled={saving} onCheckedChange={(v) => updateSetting(s.key, v)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Automation settings apply to your team's Discord webhooks</p>
          <p>• Admin users can control global automation settings</p>
          <p>• Manual "Send to Discord" buttons work regardless of automation settings</p>
          <p>• Changes take effect immediately</p>
        </CardContent>
      </Card>
    </div>
  )
}