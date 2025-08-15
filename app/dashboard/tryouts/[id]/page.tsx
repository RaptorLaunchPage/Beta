"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft,
  Edit,
  Users,
  UserPlus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Calendar,
  ExternalLink,
  Send
} from "lucide-react"
import Link from "next/link"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"

export default function TryoutDetailsPage() {
  const params = useParams()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [tryout, setTryout] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])

  const userRole = profile?.role as UserRole

  useEffect(() => {
    if (params.id) {
      loadTryoutDetails()
    }
  }, [params.id])

  const loadTryoutDetails = async () => {
    try {
      setLoading(true)
      
      setTryout({
        id: params.id,
        name: 'Raptors Main - July 2025',
        description: 'Looking for skilled players to join our main roster for the upcoming season.',
        purpose: 'existing_team',
        target_roles: ['Entry Fragger', 'IGL'],
        type: 'scrim',
        status: 'active',
        open_to_public: true,
        application_deadline: '2025-01-31T23:59:59Z',
        evaluation_method: 'mixed',
        requirements: 'Minimum 2 years competitive experience required.',
        created_at: '2025-01-15T10:00:00Z',
        launched_at: '2025-01-15T12:00:00Z'
      })

      setApplications([
        {
          id: '1',
          full_name: 'John Doe',
          ign: 'JohnGamer',
          discord_tag: 'johndoe#1234',
          role_applied_for: 'Entry Fragger',
          status: 'applied',
          created_at: '2025-01-16T10:00:00Z'
        },
        {
          id: '2',
          full_name: 'Jane Smith',
          ign: 'JaneSniper',
          discord_tag: 'janesmith#5678',
          role_applied_for: 'IGL',
          status: 'shortlisted',
          created_at: '2025-01-17T14:30:00Z'
        }
      ])
    } catch (error) {
      console.error('Error loading tryout details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      screened: 'bg-yellow-100 text-yellow-800',
      shortlisted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const copyApplicationLink = () => {
    const link = `${window.location.origin}/apply/${tryout.id}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link Copied!",
      description: "Application link copied to clipboard.",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-muted-foreground">Loading tryout details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tryout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Tryout Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The tryout you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link href="/dashboard/tryouts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tryouts
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tryouts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tryouts
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tryout.name}</h1>
            <p className="text-muted-foreground">{tryout.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${
              tryout.status === 'active' ? 'bg-green-100 text-green-800' : 
              tryout.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {tryout.status.charAt(0).toUpperCase() + tryout.status.slice(1)}
            </Badge>
            
            {['admin', 'manager'].includes(userRole) && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/tryouts/${tryout.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
                <p className="text-2xl font-bold text-green-600">
                  {applications.filter(a => a.status === 'shortlisted').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button onClick={copyApplicationLink} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy Application Link
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="flex-1 min-w-0 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="applications" className="flex-1 min-w-0 text-xs sm:text-sm">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="evaluations" className="flex-1 min-w-0 text-xs sm:text-sm">Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tryout Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purpose</p>
                  <p className="capitalize">{tryout.purpose.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="capitalize">{tryout.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Evaluation Method</p>
                  <p className="capitalize">{tryout.evaluation_method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open to Public</p>
                  <p>{tryout.open_to_public ? 'Yes' : 'No'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p>{new Date(tryout.created_at).toLocaleDateString()}</p>
                </div>
                {tryout.launched_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Launched</p>
                    <p>{new Date(tryout.launched_at).toLocaleDateString()}</p>
                  </div>
                )}
                {tryout.application_deadline && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Application Deadline</p>
                    <p>{new Date(tryout.application_deadline).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {tryout.target_roles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Target Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tryout.target_roles.map((role: string) => (
                    <Badge key={role} variant="outline">{role}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tryout.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{tryout.requirements}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                Manage and review applications for this tryout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-muted-foreground">
                    Applications will appear here once players start applying.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IGN</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.full_name}
                        </TableCell>
                        <TableCell>{application.ign}</TableCell>
                        <TableCell>{application.role_applied_for}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(application.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle>Evaluations</CardTitle>
              <CardDescription>
                Performance evaluations for shortlisted candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Evaluations Yet</h3>
                <p className="text-muted-foreground">
                  Evaluations will appear here after candidates are invited to tryout sessions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
