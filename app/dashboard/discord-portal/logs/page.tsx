"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Filter,
  AlertTriangle,
  RotateCcw
} from "lucide-react"

interface DiscordLog {
  id: string
  message_type: string
  status: string
  timestamp: string
  error_message?: string
  webhook_id?: string
  team_id?: string
  retry_count: number
  discord_webhooks?: {
    type: string
  }
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  slot_create: 'Slot Created',
  slot_update: 'Slot Updated',
  roster_update: 'Roster Update',
  performance_summary: 'Performance Summary',
  attendance_summary: 'Attendance Summary',
  expense_summary: 'Expense Summary',
  winnings_summary: 'Winnings Summary',
  system_alert: 'System Alert',
  daily_summary: 'Daily Summary',
  weekly_digest: 'Weekly Digest'
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  retry: 'bg-blue-100 text-blue-800'
}

export default function DiscordLogsPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [logs, setLogs] = useState<DiscordLog[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [teamId, setTeamId] = useState<string | 'all'>('all')
  const [teams, setTeams] = useState<{ id: string, name: string }[]>([])

  const userRole = profile?.role as UserRole
  const permissions = DashboardPermissions.getPermissions(userRole)

  useEffect(() => {
    if (profile && permissions.viewDiscordPortal) {
      bootstrap()
    }
  }, [profile, permissions.viewDiscordPortal])

  async function bootstrap() {
    try {
      const token = await getToken()
      const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const data = teamsRes.ok ? await teamsRes.json() : []
      const arr = Array.isArray(data) ? data : []
      setTeams(arr)
      // Default team for non-admins
      if (profile?.role !== 'admin') {
        const defaultTeam = profile?.team_id || arr[0]?.id
        if (defaultTeam) setTeamId(defaultTeam)
      }
      // Fetch logs after teams ready
      fetchLogs()
    } catch (e) {
      fetchLogs()
    }
  }

  useEffect(() => {
    if (profile && permissions.viewDiscordPortal) {
      fetchLogs()
    }
  }, [statusFilter, typeFilter, teamId])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('messageType', typeFilter)
      if (teamId !== 'all') params.append('teamId', teamId)
      params.append('limit', '50')

      const response = await fetch(`/api/discord-portal/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const arr = Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : []
        setLogs(arr)
      } else {
        throw new Error('Failed to fetch logs')
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: "Error",
        description: "Failed to load Discord logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const retryMessage = async (logId: string) => {
    try {
      setRetrying(logId)
      const token = await getToken()
      
      const response = await fetch('/api/discord-portal/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logId })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Message retry initiated",
        })
        fetchLogs() // Refresh logs
      } else {
        throw new Error('Failed to retry message')
      }
    } catch (error) {
      console.error('Error retrying message:', error)
      toast({
        title: "Error",
        description: "Failed to retry message",
        variant: "destructive",
      })
    } finally {
      setRetrying(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'retry':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
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

  if (!permissions.viewDiscordPortal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to view Discord logs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discord Message Logs</h1>
          <p className="text-muted-foreground">
            View Discord message history and retry failed messages
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(MESSAGE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchLogs} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message History
          </CardTitle>
          <CardDescription>
            Recent Discord message attempts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-muted-foreground">Loading logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No logs found</h3>
              <p className="text-muted-foreground">
                No Discord messages have been sent yet, or none match your filters.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Message Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Webhook Type</TableHead>
                  <TableHead>Retry Count</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge className={STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-800'}>
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {MESSAGE_TYPE_LABELS[log.message_type] || log.message_type}
                    </TableCell>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.discord_webhooks?.type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.retry_count > 0 ? (
                        <Badge variant="secondary">{log.retry_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <span className="text-sm text-red-600 truncate max-w-xs block" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === 'failed' && permissions.manageDiscordPortal && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMessage(log.id)}
                          disabled={retrying === log.id}
                        >
                          {retrying === log.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}