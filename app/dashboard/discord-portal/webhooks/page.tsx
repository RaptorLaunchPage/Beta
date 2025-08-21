import { useState, useEffect } from "react"
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
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react"
import { DashboardPermissions } from "@/lib/dashboard-permissions"
import { Select as UiSelect, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue, SelectContent as UiSelectContent, SelectItem as UiSelectItem } from "@/components/ui/select"

  const loadData = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      
      const [webhooksRes, teamsRes, defaultWebhookRes] = await Promise.all([
        fetch('/api/discord-portal/webhooks', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/teams', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/discord-portal/settings/default-webhook', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (webhooksRes.ok) {
        const webhooksData = await webhooksRes.json()
        setWebhooks(webhooksData.webhooks || [])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData || [])  // API returns array directly, not nested in .teams
        // Initialize automation to first team if available
        if (teamsData?.length && autoTeamId === 'all') {
          setAutoTeamId(teamsData[0].id)
          await fetchAutomationSettings(teamsData[0].id)
        }
      }

      // Load default contact submission webhook setting
      if (defaultWebhookRes.ok) {
        const defaultData = await defaultWebhookRes.json()
        if (defaultData?.value) setDefaultContactWebhookId(defaultData.value)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load webhook data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

                        <TableCell>
                          {webhook.type === 'team' ? (webhook.teams?.name || 'Unknown Team') : '-'}
                        </TableCell>