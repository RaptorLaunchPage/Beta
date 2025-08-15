"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Search, 
  Calendar, 
  Target, 
  Eye,
  Edit,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

interface Tryout {
  id: string
  name: string
  purpose: string
  target_roles: string[]
  team_ids: string[]
  type: string
  open_to_public: boolean
  application_deadline: string | null
  evaluation_method: string
  additional_links: any[]
  status: string
  description: string | null
  requirements: string | null
  created_by: string
  created_at: string
  updated_at: string
  launched_at: string | null
  closed_at: string | null
  _count?: {
    applications: number
    invitations: number
    selections: number
  }
}

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  closed: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-600"
}

const STATUS_ICONS = {
  draft: Clock,
  active: Target,
  closed: AlertCircle,
  completed: CheckCircle,
  archived: XCircle
}

export default function TryoutsPage() {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const userRole = profile?.role as UserRole

  useEffect(() => {
    if (profile?.id) {
      loadTryouts()
    }
  }, [profile?.id])

  const loadTryouts = async () => {
    try {
      const token = await getToken()
      if (!token) return
      setLoading(true)
      
      const response = await fetch('/api/tryouts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tryouts')
      }

      const data = await response.json()
      setTryouts(data.tryouts || [])
    } catch (error: any) {
      console.error('Error loading tryouts:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load tryouts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTryouts = tryouts.filter(tryout => {
    const matchesSearch = tryout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tryout.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tryout.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusStats = () => {
    return {
      total: tryouts.length,
      active: tryouts.filter(t => t.status === 'active').length,
      draft: tryouts.filter(t => t.status === 'draft').length,
      completed: tryouts.filter(t => t.status === 'completed').length,
      applications: tryouts.reduce((sum, t) => sum + (t._count?.applications || 0), 0)
    }
  }

  const stats = getStatusStats()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-muted-foreground">Loading tryouts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tryouts Management</h1>
            <p className="text-muted-foreground">
              Manage team recruitment and player evaluation campaigns
            </p>
          </div>
          {['admin', 'manager', 'coach'].includes(userRole) && (
            <Button asChild>
              <Link href="/dashboard/tryouts/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Tryout
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tryouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently accepting applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Draft Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" />
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.applications}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tryouts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTryouts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tryouts Found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first tryout campaign.
            </p>
            {['admin', 'manager', 'coach'].includes(userRole) && (
              <Button asChild>
                <Link href="/dashboard/tryouts/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tryout
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredTryouts.map((tryout) => {
            const StatusIcon = STATUS_ICONS[tryout.status as keyof typeof STATUS_ICONS]
            return (
              <Card key={tryout.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{tryout.name}</CardTitle>
                        <Badge className={STATUS_COLORS[tryout.status as keyof typeof STATUS_COLORS]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {tryout.status.charAt(0).toUpperCase() + tryout.status.slice(1)}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {tryout.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/tryouts/${tryout.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Purpose</p>
                      <p className="capitalize">{tryout.purpose.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Type</p>
                      <p className="capitalize">{tryout.type}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Applications</p>
                      <p>{tryout._count?.applications || 0}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Created</p>
                      <p>{new Date(tryout.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
