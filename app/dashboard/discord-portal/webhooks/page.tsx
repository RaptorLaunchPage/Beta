"use client"

import { useEffect, useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Webhook, Plus, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react"
import { DashboardPermissions } from "@/lib/dashboard-permissions"
import { Select as UiSelect, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue, SelectContent as UiSelectContent, SelectItem as UiSelectItem } from "@/components/ui/select"

interface DiscordWebhook {
  id: string
  team_id: string | null
  hook_url: string
  channel_name?: string
  type: "team" | "admin" | "global"
  active: boolean
  created_at: string
  created_by: string
  teams?: { name: string } | null
}

interface Team {
  id: string
  name: string
}

export default function WebhooksPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()

  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [autoTeamId, setAutoTeamId] = useState<string>("all")
  const [autoSettings, setAutoSettings] = useState<Record<string, boolean>>({})
  const [autoLoading, setAutoLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [editingWebhook, setEditingWebhook] = useState<DiscordWebhook | null>(null)
  const [defaultContactWebhookId, setDefaultContactWebhookId] = useState<string>("")

  const [formData, setFormData] = useState({
    hook_url: "",
    type: "team" as "team" | "admin" | "global",
    team_id: "",
    channel_name: "",
    active: true
  })
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const AUTOMATION_SETTINGS = [
    { key: "auto_slot_create", label: "Slot Creation" },
    { key: "auto_roster_update", label: "Roster Updates" },
    { key: "auto_performance_alerts", label: "Performance Alerts" },
    { key: "auto_attendance_alerts", label: "Attendance Alerts" },
    { key: "auto_daily_summary", label: "Daily Summary" },
    { key: "auto_weekly_digest", label: "Weekly Digest" },
    { key: "auto_system_alerts", label: "System Alerts" },
    { key: "auto_data_cleanup", label: "Data Cleanup" }
  ] as const

  const permissions = DashboardPermissions.getPermissions(profile?.role)

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id])

  useEffect(() => {
    if (formData.type === "team" && !formData.team_id && teams.length > 0) {
      setFormData(prev => ({ ...prev, team_id: teams[0].id }))
    }
  }, [formData.type, teams])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const [webhooksRes, teamsRes, defaultWebhookRes] = await Promise.all([
        fetch("/api/discord-portal/webhooks", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/teams", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/discord-portal/settings/default-webhook", { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (webhooksRes.ok) {
        const webhooksData = await webhooksRes.json()
        setWebhooks(webhooksData.webhooks || [])
      } else {
        setWebhooks([])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(Array.isArray(teamsData) ? teamsData : [])
        if (Array.isArray(teamsData) && teamsData.length && autoTeamId === "all") {
          setAutoTeamId(teamsData[0].id)
          await fetchAutomationSettings(teamsData[0].id)
        }
      } else {
        setTeams([])
      }

      if (defaultWebhookRes.ok) {
        const defaultData = await defaultWebhookRes.json()
        if (defaultData?.value) setDefaultContactWebhookId(defaultData.value)
      }
    } catch (e) {
      console.error("Error loading data:", e)
      toast({ title: "Error", description: "Failed to load webhook data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function fetchAutomationSettings(teamId?: string) {
    try {
      setAutoLoading(true)
      const token = await getToken()
      const params = new URLSearchParams()
      if (teamId) params.append("teamId", teamId)
      const res = await fetch(`/api/discord-portal/settings?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.settings) ? data.settings : []
        const map: Record<string, boolean> = {}
        list.forEach((s: any) => { map[s.setting_key] = !!s.setting_value })
        setAutoSettings(map)
      } else {
        setAutoSettings({})
      }
    } finally {
      setAutoLoading(false)
    }
  }

  async function toggleAutomation(key: string, enabled: boolean) {
    try {
      const token = await getToken()
      if (autoTeamId === "all") {
        for (const t of teams) {
          await fetch("/api/discord-portal/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ settingKey: key, enabled, teamId: t.id, isGlobal: false })
          })
        }
        toast({ title: "Updated", description: "Applied to all teams" })
      } else {
        const res = await fetch("/api/discord-portal/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ settingKey: key, enabled, teamId: autoTeamId, isGlobal: false })
        })
        if (!res.ok) throw new Error("Failed to update setting")
        toast({ title: "Updated", description: "Automation setting updated" })
      }
      setAutoSettings(prev => ({ ...prev, [key]: enabled }))
    } catch (e) {
      toast({ title: "Error", description: "Failed to update automation", variant: "destructive" })
    }
  }

  const validateWebhook = async (url: string) => {
    if (!url) return false
    setValidating(true)
    try {
      const token = await getToken()
      const response = await fetch("/api/discord-portal/webhooks/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url })
      })
      const result = await response.json()
      if (result.valid) {
        toast({ title: "Valid Webhook", description: "Discord webhook URL is valid and accessible" })
        return true
      } else {
        toast({ title: "Invalid Webhook", description: result.error, variant: "destructive" })
        return false
      }
    } catch {
      toast({ title: "Validation Error", description: "Failed to validate webhook URL", variant: "destructive" })
      return false
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.hook_url) {
      toast({ title: "Error", description: "Webhook URL is required", variant: "destructive" })
      return
    }
    if (formData.type === "team" && !formData.team_id) {
      toast({ title: "Error", description: "Team is required for team webhooks", variant: "destructive" })
      return
    }
    const isValid = await validateWebhook(formData.hook_url)
    if (!isValid) return

    setSubmitting(true)
    try {
      const token = await getToken()
      const method = editingWebhook ? "PUT" : "POST"
      const body = editingWebhook ? { id: editingWebhook.id, ...formData } : formData
      const res = await fetch("/api/discord-portal/webhooks", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save webhook")
      }
      toast({ title: "Success", description: `Webhook ${editingWebhook ? "updated" : "created"} successfully` })
      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save webhook", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/discord-portal/webhooks?id=${webhookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete webhook")
      }
      toast({ title: "Success", description: "Webhook deleted successfully" })
      loadData()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete webhook", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({ hook_url: "", type: "team", team_id: "", channel_name: "", active: true })
    setEditingWebhook(null)
  }

  const openEditDialog = (webhook: DiscordWebhook) => {
    setFormData({
      hook_url: webhook.hook_url,
      type: webhook.type,
      team_id: webhook.team_id || "",
      channel_name: webhook.channel_name || "",
      active: webhook.active
    })
    setEditingWebhook(webhook)
    setIsDialogOpen(true)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "team": return "bg-blue-100 text-blue-800"
      case "admin": return "bg-purple-100 text-purple-800"
      case "global": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (!permissions.manageDiscordPortal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to manage webhooks.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Default Contact Submission Webhook (Admin) */}
      {permissions.manageDiscordPortal && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Form Submission Webhook</CardTitle>
            <CardDescription>Select which admin/global webhook receives public Contact form submissions.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <UiSelect value={defaultContactWebhookId} onValueChange={(v) => setDefaultContactWebhookId(v)}>
              <UiSelectTrigger className="w-80">
                <UiSelectValue placeholder="Choose a webhook" />
              </UiSelectTrigger>
              <UiSelectContent>
                {webhooks.filter(w => w.type === 'admin' || w.type === 'global').map(w => (
                  <UiSelectItem key={w.id} value={w.id}>{w.channel_name || `${w.type.toUpperCase()} Webhook`}</UiSelectItem>
                ))}
              </UiSelectContent>
            </UiSelect>
            <Button onClick={async () => {
              try {
                const token = await getToken()
                const res = await fetch('/api/discord-portal/settings/default-webhook', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ value: defaultContactWebhookId })
                })
                if (!res.ok) throw new Error('Failed to save setting')
                toast({ title: 'Saved', description: 'Default contact submission webhook updated.' })
              } catch (e) {
                toast({ title: 'Error', description: 'Failed to update default webhook', variant: 'destructive' })
              }
            }}>Save</Button>
          </CardContent>
        </Card>
      )}

      {/* Team-specific Automation Management */}
      {permissions.manageDiscordPortal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Automation</span>
              <div className="flex items-center gap-2">
                <Label>Team</Label>
                <Select value={autoTeamId} onValueChange={async (val) => { setAutoTeamId(val); if (val !== 'all') await fetchAutomationSettings(val) }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
            <CardDescription>Manage automation per team or apply to all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUTOMATION_SETTINGS.map(s => (
                <div key={s.key} className="flex items-center justify-between p-3 rounded border">
                  <div className="space-y-1">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.key}</div>
                  </div>
                  <Switch checked={!!autoSettings[s.key]} disabled={autoLoading} onCheckedChange={(v) => toggleAutomation(s.key, v)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Webhooks UI */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discord Webhooks</h1>
          <p className="text-muted-foreground">Configure Discord webhook URLs for team and admin notifications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Add New Webhook'}</DialogTitle>
              <DialogDescription>Configure a Discord webhook URL for notifications</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hook_url">Discord Webhook URL</Label>
                <Input id="hook_url" type="url" placeholder="https://discord.com/api/webhooks/..." value={formData.hook_url} onChange={(e) => setFormData(prev => ({ ...prev, hook_url: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Webhook Type</Label>
                <Select value={formData.type} onValueChange={(value: 'team' | 'admin' | 'global') => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    {profile?.role === 'admin' && (<>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                    </>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel_name">Discord Channel Name</Label>
                <Input id="channel_name" type="text" placeholder="e.g., #general, #performance-updates, #team-alerts" value={formData.channel_name} onChange={(e) => setFormData(prev => ({ ...prev, channel_name: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Enter the Discord channel name where messages will be sent (for easy identification)</p>
              </div>
              {formData.type === 'team' && (
                <div className="space-y-2">
                  <Label htmlFor="team_id">Team</Label>
                  <Select value={formData.team_id} onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch id="active" checked={formData.active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))} />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting || validating} className="flex-1">
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (editingWebhook ? 'Update Webhook' : 'Add Webhook')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading webhooks...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Configured Webhooks</CardTitle>
            <CardDescription>Manage Discord webhook URLs for different notification types</CardDescription>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-8 w-8 mx-auto mb-2" />
                <p>No webhooks configured</p>
                <p className="text-sm">Add your first Discord webhook to start receiving notifications</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <Badge className={getTypeColor(webhook.type)}>{webhook.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{webhook.channel_name || '#unknown-channel'}</span>
                        </TableCell>
                        <TableCell>
                          {webhook.type === 'team' ? (webhook.teams?.name || 'Unknown Team') : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono text-sm">{webhook.hook_url.replace(/\/[^\/]+$/, '/***')}</span>
                            <Button variant="ghost" size="sm" onClick={() => window.open(webhook.hook_url, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {webhook.active ? (
                            <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
                          ) : (
                            <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(webhook.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(webhook)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(webhook.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}