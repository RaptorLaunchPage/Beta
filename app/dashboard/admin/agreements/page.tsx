"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CURRENT_AGREEMENT_VERSIONS } from "@/lib/agreement-versions"
import { 
  FileText, 
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Edit,
  Plus
} from "lucide-react"
import ReactMarkdown from 'react-markdown'

interface AgreementContent {
  role: string
  current_version: number
  title: string
  content: string
  last_updated?: string
  updated_by?: string
}

export default function AgreementManagementPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  
  const [agreements, setAgreements] = useState<Record<string, AgreementContent>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('player')
  const [editingContent, setEditingContent] = useState<AgreementContent | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Load all agreements
  useEffect(() => {
    const loadAgreements = async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('No auth token')

        const response = await fetch('/api/admin/agreements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to load agreements: ${response.statusText}`)
        }

        const data = await response.json()
        setAgreements(data.agreements)
        
        // Set first available role as selected
        const roles = Object.keys(data.agreements)
        if (roles.length > 0) {
          setSelectedRole(roles[0])
          setEditingContent(data.agreements[roles[0]])
        }
      } catch (error) {
        console.error('Failed to load agreements:', error)
        toast({
          title: "Error",
          description: "Failed to load agreements. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (profile?.role === 'admin') {
      loadAgreements()
    }
  }, [profile, getToken, toast])

  // Switch roles
  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    setEditingContent(agreements[role] || {
      role,
      current_version: CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS] || 1,
      title: `${role.charAt(0).toUpperCase() + role.slice(1)} Agreement v1.0`,
      content: `# ${role.charAt(0).toUpperCase() + role.slice(1)} Agreement\n\nPlease define the agreement content for this role.`
    })
    setPreviewMode(false)
  }

  // Update editing content
  const updateEditingContent = (field: keyof AgreementContent, value: string | number) => {
    if (!editingContent) return
    setEditingContent({
      ...editingContent,
      [field]: value
    })
  }

  // Save agreement
  const saveAgreement = async () => {
    if (!editingContent) return
    
    setSaving(selectedRole)
    try {
      const token = await getToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/admin/agreements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: editingContent.role,
          title: editingContent.title,
          content: editingContent.content,
          version: editingContent.current_version
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save agreement: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Update local state
      setAgreements(prev => ({
        ...prev,
        [selectedRole]: data.agreement
      }))

      toast({
        title: "Agreement Saved",
        description: `${editingContent.title} has been updated successfully.`,
      })
    } catch (error) {
      console.error('Failed to save agreement:', error)
      toast({
        title: "Error",
        description: "Failed to save agreement. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(null)
    }
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
                Admin access is required to manage agreements.
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
              <p className="text-muted-foreground">Loading agreements...</p>
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
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Agreement Management</h1>
            <p className="text-muted-foreground">
              Create and edit role-based user agreements.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agreement Roles</CardTitle>
              <CardDescription>
                Select a role to edit its agreement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(CURRENT_AGREEMENT_VERSIONS).map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? "default" : "outline"}
                  className={`w-full justify-between ${
                    selectedRole === role 
                      ? 'bg-primary/80 hover:bg-primary/90 text-white border-primary/40' 
                      : 'bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40'
                  }`}
                  onClick={() => handleRoleChange(role)}
                >
                  <span className="capitalize">{role}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      v{agreements[role]?.current_version || CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS]}
                    </Badge>
                    {agreements[role] ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-orange-400" />
                    )}
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3">
          {editingContent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">
                      {selectedRole} Agreement
                    </CardTitle>
                    <CardDescription>
                      Edit the agreement content and settings
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                      className="bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
                    >
                      {previewMode ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                    <Button
                      onClick={saveAgreement}
                      disabled={saving === selectedRole}
                      size="sm"
                      className="bg-primary/80 hover:bg-primary/90 text-white border-primary/40"
                    >
                      {saving === selectedRole ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!previewMode ? (
                  <>
                    {/* Agreement Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Agreement Title</Label>
                        <Input
                          id="title"
                          value={editingContent.title}
                          onChange={(e) => updateEditingContent('title', e.target.value)}
                          placeholder="e.g., Player Agreement v2.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version">Version</Label>
                        <Input
                          id="version"
                          type="number"
                          min="1"
                          value={editingContent.current_version}
                          onChange={(e) => updateEditingContent('current_version', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-white">Agreement Content (Markdown)</Label>
                      <Textarea
                        id="content"
                        value={editingContent.content}
                        onChange={(e) => updateEditingContent('content', e.target.value)}
                        placeholder="Enter agreement content in Markdown format..."
                        className="min-h-[400px] font-mono text-sm bg-black/60 backdrop-blur-md border-white/30 text-white placeholder:text-white/50 focus:bg-black/70 focus:border-white/50"
                      />
                      <p className="text-xs text-white/70">
                        You can use Markdown formatting. The content will be displayed to users when they need to accept the agreement.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Preview Mode */
                  <div className="space-y-4">
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        This is how the agreement will appear to users.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="border border-white/30 rounded-lg p-6 bg-white/5 backdrop-blur-sm">
                      <div className="mb-4">
                        <h2 className="text-xl font-semibold text-white">{editingContent.title}</h2>
                        <p className="text-sm text-white/70">
                          Version {editingContent.current_version}
                        </p>
                      </div>
                      
                      <div className="prose prose-sm max-w-none text-white">
                        <ReactMarkdown 
                          components={{
                            h1: ({ children }) => <h1 className="text-white text-xl font-bold mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-white text-lg font-semibold mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-white text-md font-medium mb-2">{children}</h3>,
                            p: ({ children }) => <p className="text-white/90 mb-3">{children}</p>,
                            ul: ({ children }) => <ul className="text-white/90 mb-3 list-disc list-inside">{children}</ul>,
                            ol: ({ children }) => <ol className="text-white/90 mb-3 list-decimal list-inside">{children}</ol>,
                            li: ({ children }) => <li className="text-white/90 mb-1">{children}</li>,
                          }}
                        >
                          {editingContent.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Information */}
                {editingContent.last_updated && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(editingContent.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
