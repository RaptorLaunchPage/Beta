"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Settings, 
  Shield, 
  Save,
  AlertTriangle,
  CheckCircle,
  Users,
  RefreshCw
} from "lucide-react"

interface AdminSettings {
  agreement_enforcement_enabled: string
  agreement_dev_override: string
}

interface AgreementUser {
  id: string
  name: string
  role: string
  email: string
  agreement_status: 'missing' | 'outdated' | 'current' | 'declined'
  current_version?: number
  required_version: number
}

export default function AdminSettingsPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  
  const [settings, setSettings] = useState<AdminSettings>({
    agreement_enforcement_enabled: 'false',
    agreement_dev_override: 'false'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agreementUsers, setAgreementUsers] = useState<AgreementUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('No auth token')

        const response = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.statusText}`)
        }

        const data = await response.json()
        setSettings(data.settings)
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (profile?.role === 'admin') {
      loadSettings()
    }
  }, [profile, toast])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      })

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`)
      }

      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof AdminSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value ? 'true' : 'false'
    }))
  }

  // Check admin access
  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                Admin access is required to view this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">
              Manage system-wide configuration and policies.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Agreement Enforcement Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Agreement Enforcement
            </CardTitle>
            <CardDescription>
              Control whether users must accept role-based agreements to access the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enforcement-toggle" className="text-base font-medium">
                  Enable Agreement Enforcement
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, users must accept their role-specific agreement to access protected areas.
                </p>
              </div>
              <Switch
                id="enforcement-toggle"
                checked={settings.agreement_enforcement_enabled === 'true'}
                onCheckedChange={(checked) => updateSetting('agreement_enforcement_enabled', checked)}
              />
            </div>

            {/* Development Override */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="dev-override-toggle" className="text-base font-medium">
                  Development Override
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bypass agreement enforcement for development and testing purposes.
                </p>
              </div>
              <Switch
                id="dev-override-toggle"
                checked={settings.agreement_dev_override === 'true'}
                onCheckedChange={(checked) => updateSetting('agreement_dev_override', checked)}
              />
            </div>

            {/* Status Alert */}
            {settings.agreement_enforcement_enabled === 'true' ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Agreement enforcement is <strong>ENABLED</strong>. Users will be required to accept agreements.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Agreement enforcement is <strong>DISABLED</strong>. Users can access the system without accepting agreements.
                </AlertDescription>
              </Alert>
            )}

            {settings.agreement_dev_override === 'true' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Development Override is ACTIVE</strong> - Agreement enforcement will be bypassed regardless of the main setting.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Environment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
            <CardDescription>
              Current environment configuration and overrides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-md border-white/20 rounded-lg">
                <Label className="text-sm font-medium text-white">Environment</Label>
                <p className="text-sm text-white/70">
                  {process.env.NODE_ENV || 'Unknown'}
                </p>
              </div>
              <div className="p-3 bg-white/10 backdrop-blur-md border-white/20 rounded-lg">
                <Label className="text-sm font-medium text-white">Client Override</Label>
                <p className="text-sm text-white/70">
                  {process.env.NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT === 'true' ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            
            {process.env.NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT === 'true' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The environment variable <code>NEXT_PUBLIC_DISABLE_AGREEMENT_ENFORCEMENT</code> is set to true, 
                  which will override agreement enforcement in development mode.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Save Changes</h3>
                <p className="text-sm text-muted-foreground">
                  Changes take effect immediately after saving.
                </p>
              </div>
              <Button 
                onClick={saveSettings} 
                disabled={saving}
                size="lg"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
