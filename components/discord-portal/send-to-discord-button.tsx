"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { MessageSquare, Send, Eye, Loader2, Webhook, AlertCircle } from "lucide-react"
import type { MessageType } from "@/modules/discord-portal"

interface SendToDiscordButtonProps {
  messageType: MessageType
  data: any
  teamId?: string
  webhookTypes?: ('team' | 'admin' | 'global')[]
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  children?: React.ReactNode
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
    icon_url?: string
  }
  timestamp?: string
}

interface AvailableWebhook {
  id: string
  hook_url: string
  channel_name?: string
  type: 'team' | 'admin' | 'global'
  active: boolean
  team_id?: string
  teams?: { name: string } | null
}

export function SendToDiscordButton({
  messageType,
  data,
  teamId,
  webhookTypes = ['team'],
  disabled = false,
  variant = 'outline',
  size = 'default',
  children
}: SendToDiscordButtonProps) {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [preview, setPreview] = useState<{ embeds: DiscordEmbed[] } | null>(null)
  const [availableWebhooks, setAvailableWebhooks] = useState<AvailableWebhook[]>([])
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>("")
  const [loadingWebhooks, setLoadingWebhooks] = useState(false)

  // Check if user has permission to send messages (Admin, Manager, Coach, Analyst only - NOT Player)
  const canSendMessages = profile?.role && ['admin', 'manager', 'coach', 'analyst'].includes(profile.role)

  // Load available webhooks when dialog opens
  useEffect(() => {
    if (isOpen && canSendMessages) {
      loadAvailableWebhooks()
    }
  }, [isOpen, canSendMessages])

  const loadAvailableWebhooks = async () => {
    setLoadingWebhooks(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/discord-portal/webhooks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const webhooks = data.webhooks || data || []
        
        // Filter webhooks based on the requested webhook types and user permissions
        const filteredWebhooks = webhooks.filter((webhook: AvailableWebhook) => {
          if (!webhook.active) return false
          
          // Always include admin and global webhooks if requested
          if (['admin', 'global'].includes(webhook.type) && webhookTypes.includes(webhook.type as any)) {
            return true
          }
          
          // For team webhooks, check if it matches the requested team or if no specific team is requested
          if (webhook.type === 'team' && webhookTypes.includes('team')) {
            // If specific team is requested, only show that team's webhooks
            if (teamId) {
              return webhook.team_id === teamId
            }
            // If no specific team, show all team webhooks (for admin/manager users)
            return true
          }
          
          return false
        })

        setAvailableWebhooks(filteredWebhooks)
        
        // Auto-select first webhook if only one available
        if (filteredWebhooks.length === 1) {
          setSelectedWebhookId(filteredWebhooks[0].id)
        } else if (filteredWebhooks.length === 0) {
          toast({
            title: "No Webhooks Available",
            description: "No active Discord webhooks found. Please configure webhooks first.",
            variant: "destructive"
          })
        }
      } else {
        console.error('Failed to load webhooks')
        toast({
          title: "Error Loading Webhooks",
          description: "Failed to load available Discord webhooks",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast({
        title: "Error Loading Webhooks",
        description: "Network error while loading webhooks",
        variant: "destructive"
      })
    } finally {
      setLoadingWebhooks(false)
    }
  }

  const generatePreview = async () => {
    if (!canSendMessages) return

    setIsLoading(true)
    try {
      const token = await getToken()
      const queryParams = new URLSearchParams({
        messageType,
        data: JSON.stringify(data)
      })
      
      if (selectedWebhookId) {
        queryParams.append('webhookId', selectedWebhookId)
      }

      const response = await fetch(`/api/discord-portal/send?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setPreview(result.preview)
      } else {
        const error = await response.json()
        toast({
          title: "Preview Error",
          description: error.error || "Failed to generate preview",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      toast({
        title: "Preview Error",
        description: "Failed to generate message preview",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!canSendMessages || !selectedWebhookId) {
      toast({
        title: "No Webhook Selected",
        description: "Please select a Discord webhook to send the message",
        variant: "destructive"
      })
      return
    }

    setIsSending(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/discord-portal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageType,
          data,
          teamId,
          webhookTypes,
          webhookId: selectedWebhookId
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Message Sent!",
          description: "Successfully sent to Discord",
        })
        setIsOpen(false)
      } else {
        const error = await response.json()
        toast({
          title: "Send Failed",
          description: error.error || "Failed to send message to Discord",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Send Failed",
        description: "Network error while sending message",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  const formatColorForDisplay = (color?: number) => {
    if (!color) return '#000000'
    return `#${color.toString(16).padStart(6, '0')}`
  }

  const getMessageTypeDisplayName = (type: MessageType) => {
    const names: Record<MessageType, string> = {
      slot_create: 'Slot Created',
      slot_update: 'Slot Updated',
      roster_update: 'Roster Updated',
      performance_summary: 'Performance Report',
      attendance_summary: 'Attendance Report',
      expense_summary: 'Expense Report',
      winnings_summary: 'Winnings Report',
      daily_summary: 'Daily Summary',
      weekly_digest: 'Weekly Digest',
      analytics_trend: 'Analytics Trend',
      system_alert: 'System Alert',
      data_cleanup: 'Data Cleanup'
    }
    return names[type] || type
  }

  const getWebhookDisplayName = (webhook: AvailableWebhook) => {
    const channelName = webhook.channel_name || '#unknown-channel'
    const teamName = webhook.teams?.name || 'Unknown Team'
    
    switch (webhook.type) {
      case 'team':
        return `${channelName} (${teamName})`
      case 'admin':
        return `${channelName} (Admin)`
      case 'global':
        return `${channelName} (Global)`
      default:
        return channelName
    }
  }

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'team': return 'bg-blue-100 text-blue-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'global': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!canSendMessages) {
    return null // Don't show button if user can't send messages
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          onClick={generatePreview}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {children || 'Send to Discord'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send to Discord
          </DialogTitle>
          <DialogDescription>
            Preview and send this {getMessageTypeDisplayName(messageType).toLowerCase()} to Discord
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Type & Target Info */}
          <div className="flex gap-2">
            <Badge variant="outline">{getMessageTypeDisplayName(messageType)}</Badge>
            <Badge variant="secondary">
              {webhookTypes.includes('team') && 'Team'}
              {webhookTypes.includes('admin') && ' Admin'}
              {webhookTypes.includes('global') && ' Global'}
            </Badge>
          </div>

          {/* Webhook Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Select Discord Channel
              </CardTitle>
              <CardDescription>
                Choose which Discord channel to send this message to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWebhooks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading available channels...
                </div>
              ) : availableWebhooks.length === 0 ? (
                <div className="flex items-center justify-between p-4 bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 rounded-lg shadow-xl text-white">
                  <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-200 drop-shadow-md">No webhooks found</div>
                      <div className="text-white/90 drop-shadow-sm">Configure Discord webhooks first to send messages</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsOpen(false)
                      window.open('/dashboard/discord-portal/webhooks', '_blank')
                    }}
                  >
                    Setup Webhooks
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Discord channel..." />
                    </SelectTrigger>
                                         <SelectContent>
                       {availableWebhooks.map((webhook) => (
                         <SelectItem key={webhook.id} value={webhook.id}>
                           <div className="flex items-center gap-2 w-full">
                             <span className={`px-2 py-1 text-xs rounded ${getWebhookTypeColor(webhook.type)}`}>
                               {webhook.type}
                             </span>
                             <span className="truncate">{getWebhookDisplayName(webhook)}</span>
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                  
                  {selectedWebhookId && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {getWebhookDisplayName(availableWebhooks.find(w => w.id === selectedWebhookId)!)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Message Preview
              </CardTitle>
              <CardDescription>
                This is how your message will appear in Discord
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Generating preview...
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {preview.embeds.map((embed, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/20">
                      {/* Embed Color Bar */}
                      {embed.color && (
                        <div 
                          className="w-1 h-full absolute left-0 top-0 rounded-l-lg"
                          style={{ backgroundColor: formatColorForDisplay(embed.color) }}
                        />
                      )}
                      
                      {/* Embed Title */}
                      {embed.title && (
                        <h3 className="font-semibold text-lg mb-2">{embed.title}</h3>
                      )}
                      
                      {/* Embed Description */}
                      {embed.description && (
                        <p className="text-sm text-muted-foreground mb-3">{embed.description}</p>
                      )}
                      
                      {/* Embed Fields */}
                      {embed.fields && embed.fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          {embed.fields.map((field, fieldIndex) => (
                            <div key={fieldIndex} className={field.inline ? '' : 'col-span-full'}>
                              <div className="font-medium text-sm">{field.name}</div>
                              <div className="text-sm text-muted-foreground">{field.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Embed Footer */}
                      {embed.footer && (
                        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                          {embed.footer.text}
                          {embed.timestamp && (
                            <span className="ml-2">
                              • {new Date(embed.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click the button above to generate a preview
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {availableWebhooks.length > 0 && !selectedWebhookId && (
                "Please select a Discord channel to continue"
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generatePreview}
                disabled={!selectedWebhookId || loadingWebhooks}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button 
                onClick={sendMessage} 
                disabled={!preview || isSending || !selectedWebhookId}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to Discord
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}