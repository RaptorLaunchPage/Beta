"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { DashboardPermissions } from "@/lib/dashboard-permissions"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, Webhook as WebhookIcon, Shield, Globe } from "lucide-react"

type WebhookType = 'team' | 'admin' | 'global'

interface Webhook {
  id: string
  hook_url: string
  channel_name?: string
  type: WebhookType
  active: boolean
  team_id?: string | null
  teams?: { name: string } | null
}

interface TeamOption {
  id: string
  name: string
}

interface WebhookFormState {
  id?: string
  hook_url: string
  channel_name: string
  type: WebhookType
  team_id?: string | null
  active: boolean
}

export default function WebhooksPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()

  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [form, setForm] = useState<WebhookFormState>({
    hook_url: "",
    channel_name: "",
    type: 'team',
    team_id: null,
    active: true
  })

  // Admin default webhook selection
  const isAdmin = profile?.role === 'admin'
  const [defaultWebhookId, setDefaultWebhookId] = useState<string>("")
  const [savingDefault, setSavingDefault] = useState<boolean>(false)

  const permissions = useMemo(() => DashboardPermissions.getPermissions(profile?.role), [profile?.role])

  useEffect(() => {
    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function bootstrap() {
    if (!profile) return
    setLoading(true)
    try {
      const token = await getToken()
      const [webhooksRes, teamsRes, defaultWebhookRes] = await Promise.all([
        fetch('/api/discord-portal/webhooks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
        isAdmin ? fetch('/api/discord-portal/settings/default-webhook', { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(new Response(null, { status: 204 }))
      ])

      if (webhooksRes.ok) {
        const data = await webhooksRes.json()
        setWebhooks(Array.isArray(data) ? data : (data.webhooks || []))
      } else {
        setWebhooks([])
      }

      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeams(Array.isArray(data) ? data : [])
      } else {
        setTeams([])
      }

      if (isAdmin && defaultWebhookRes.status === 200) {
        const data = await defaultWebhookRes.json()
        setDefaultWebhookId(String(data?.value || ""))
      }
    } catch (e) {
      console.error('Error loading webhooks UI:', e)
      toast({ title: 'Error', description: 'Failed to load webhooks', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setIsEditMode(false)
    setForm({ hook_url: "", channel_name: "", type: 'team', team_id: teams[0]?.id || null, active: true })
    setIsDialogOpen(true)
  }

  function openEditDialog(webhook: Webhook) {
    setIsEditMode(true)
    setForm({
      id: webhook.id,
      hook_url: webhook.hook_url,
      channel_name: webhook.channel_name || '',
      type: webhook.type,
      team_id: webhook.type === 'team' ? (webhook.team_id || null) : null,
      active: webhook.active
    })
    setIsDialogOpen(true)
  }

  function handleFormChange<K extends keyof WebhookFormState>(key: K, value: WebhookFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function validateWebhook(url: string): Promise<boolean> {
    try {
      const res = await fetch('/api/discord-portal/webhooks/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!res.ok) return true // be permissive on validation endpoint failure
      const result = await res.json()
      return !!result.valid
    } catch {
      return true
    }
  }

  async function saveWebhook() {
    if (!permissions.manageDiscordPortal) return
    setSaving(true)
    try {
      if (!form.hook_url || !form.type) {
        toast({ title: 'Missing fields', description: 'Webhook URL and type are required', variant: 'destructive' })
        return
      }

      // Validate URL format with backend helper
      const isValid = await validateWebhook(form.hook_url)
      if (!isValid) {
        toast({ title: 'Invalid URL', description: 'Please provide a valid Discord webhook URL', variant: 'destructive' })
        return
      }

      const token = await getToken()
      const payload: any = {
        hook_url: form.hook_url,
        channel_name: form.channel_name || undefined,
        type: form.type,
        team_id: form.type === 'team' ? (form.team_id || undefined) : undefined,
        active: form.active
      }

      let res: Response
      if (isEditMode && form.id) {
        res = await fetch('/api/discord-portal/webhooks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: form.id, ...payload })
        })
      } else {
        res = await fetch('/api/discord-portal/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save webhook')
      }

      toast({ title: 'Success', description: `Webhook ${isEditMode ? 'updated' : 'created'}` })
      setIsDialogOpen(false)
      await bootstrap()
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save webhook', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteWebhook(id: string) {
    if (!permissions.manageDiscordPortal) return
    setDeletingId(id)
    try {
      const token = await getToken()
      const res = await fetch(`/api/discord-portal/webhooks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete webhook')
      }
      toast({ title: 'Deleted', description: 'Webhook removed' })
      await bootstrap()
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to delete webhook', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleActive(webhook: Webhook) {
    if (!permissions.manageDiscordPortal) return
    setTogglingId(webhook.id)
    try {
      const token = await getToken()
      const res = await fetch('/api/discord-portal/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: webhook.id, active: !webhook.active })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update status')
      }
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, active: !w.active } : w))
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to update status', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  async function saveDefaultWebhook() {
    if (!isAdmin) return
    setSavingDefault(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/discord-portal/settings/default-webhook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: defaultWebhookId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save default webhook')
      }
      toast({ title: 'Saved', description: 'Default webhook updated' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save default webhook', variant: 'destructive' })
    } finally {
      setSavingDefault(false)
    }
  }

  const getTypeBadge = (type: WebhookType) => {
    switch (type) {
      case 'team':
        return <Badge className="bg-blue-100 text-blue-800">Team</Badge>
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
      case 'global':
        return <Badge className="bg-green-100 text-green-800">Global</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><WebhookIcon className="h-5 w-5" /> Webhooks</h2>
          <p className="text-muted-foreground">Create and manage Discord webhooks</p>
        </div>
        {permissions.manageDiscordPortal && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> New Webhook
          </Button>
        )}
      </div>

      {/* Default webhook selection for admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Default Public Webhook</CardTitle>
            <CardDescription>Used for public-facing forms and contact submissions</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-full max-w-md">
              <Label className="text-sm">Select default webhook</Label>
              <Select value={defaultWebhookId} onValueChange={setDefaultWebhookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose webhook" />
                </SelectTrigger>
                <SelectContent>
                  {webhooks.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.channel_name || '#unknown'} — {w.type.toUpperCase()} {w.teams?.name ? `(${w.teams.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveDefaultWebhook} disabled={savingDefault || !defaultWebhookId}>
              {savingDefault ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>Active webhooks available for sending notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading webhooks...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No webhooks configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map(w => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="font-medium">{w.channel_name || '#unknown-channel'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{w.hook_url}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(w.type)}
                        {w.type === 'global' ? <Globe className="h-3.5 w-3.5 text-green-600" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {w.type === 'team' ? (w.teams?.name || 'Unknown Team') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={w.active} onCheckedChange={() => toggleActive(w)} disabled={!permissions.manageDiscordPortal || togglingId === w.id} />
                        <span className={`text-sm ${w.active ? 'text-green-600' : 'text-muted-foreground'}`}>{w.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {permissions.manageDiscordPortal && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(w)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteWebhook(w.id)} disabled={deletingId === w.id}>
                            {deletingId === w.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />} Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update Discord webhook details' : 'Add a new Discord webhook'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input value={form.hook_url} onChange={e => handleFormChange('hook_url', e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
            </div>

            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input value={form.channel_name} onChange={e => handleFormChange('channel_name', e.target.value)} placeholder="#channel-name" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(val: WebhookType) => {
                  handleFormChange('type', val)
                  if (val !== 'team') handleFormChange('team_id', null)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.type === 'team' && (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={form.team_id || ''} onValueChange={(val) => handleFormChange('team_id', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(val) => handleFormChange('active', val)} />
              <span className="text-sm">Active</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveWebhook} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isEditMode ? 'Save Changes' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}