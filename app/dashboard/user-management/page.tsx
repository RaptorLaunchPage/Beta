"use client"

import { useEffect, useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { Trash2, Edit, RefreshCw, Users, Mail, Bot, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

export default function UserManagementPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [refreshing, setRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<string>("")

  // Filter users by provider
  const emailUsers = allUsers.filter(user => user.provider === 'email' || !user.provider)
  const discordUsers = allUsers.filter(user => user.provider === 'discord')

  // Check if user is admin
  const isAdmin = profile?.role === 'admin'

  // Initialize component
  useEffect(() => {
    console.log('🔍 UserManagement: Component mounted')
    console.log('🔍 UserManagement: Profile:', profile)
    console.log('🔍 UserManagement: Is Admin:', isAdmin)
    
    if (profile) {
      if (isAdmin) {
        loadAllData()
      } else {
        setError('Access denied: Admin role required')
        setLoading(false)
      }
    }
  }, [profile, isAdmin])

  const loadAllData = async () => {
    console.log('🔍 UserManagement: Starting data load...')
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchUsers(),
        fetchTeams()
      ])
    } catch (err: any) {
      console.error('❌ UserManagement: Failed to load data:', err)
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    console.log('🔍 UserManagement: Fetching users...')
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use API endpoint instead of direct Supabase call
      console.log('🔍 UserManagement: Attempting API call...')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const users = await response.json()
      console.log('✅ UserManagement: API call successful:', users.length, 'users')
      setAllUsers(users)
      setDataSource("API Endpoint")
      return

    } catch (err: any) {
      console.error('❌ UserManagement: API call failed, falling back to direct query:', err)
      
      try {
        // Fallback to direct query
        console.log('🔍 UserManagement: Attempting direct query fallback...')
        const { data: directData, error: directError } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (directData && directData.length > 0 && !directError) {
          console.log('✅ UserManagement: Direct query fallback successful:', directData.length, 'users')
          setAllUsers(directData)
          setDataSource("Direct Query (Fallback)")
          return
        }
        
        if (directError) {
          console.warn('⚠️ UserManagement: Direct query fallback failed:', directError)
        }

        // Method 3: Try with specific admin permissions
        console.log('🔍 UserManagement: Attempting admin query...')
        let adminResult
        try {
          adminResult = await supabase.rpc('get_all_users_admin')
        } catch (rpcError) {
          // Fallback to basic select if RPC doesn't exist
          console.log('🔍 UserManagement: RPC not found, trying basic select...')
          adminResult = await supabase
            .from("users")
            .select(`
              id,
              email,
              name,
              role,
              team_id,
              avatar_url,
              created_at,
              provider,
              status
            `)
            .order("created_at", { ascending: false })
        }
        
        const { data: adminData, error: adminError } = adminResult
        
        if (adminData && adminData.length > 0 && !adminError) {
          console.log('✅ UserManagement: Admin query successful:', adminData.length, 'users')
          setAllUsers(adminData)
          setDataSource("Admin Query")
          return
        }

        if (adminError) {
          console.warn('⚠️ UserManagement: Admin query failed:', adminError)
        }

        // Method 4: Emergency raw query
        console.log('🔍 UserManagement: Attempting emergency query...')
        const { data: emergencyData, error: emergencyError } = await supabase
          .from("users")
          .select("*")
          .limit(1000) // Large limit to get all users
        
        if (emergencyData && !emergencyError) {
          console.log('✅ UserManagement: Emergency query successful:', emergencyData.length, 'users')
          setAllUsers(emergencyData || [])
          setDataSource("Emergency Query")
          return
        }

        // All methods failed
        throw new Error(`All data fetching methods failed. Last error: ${emergencyError?.message || 'Unknown error'}`)
        
      } catch (fallbackErr: any) {
        console.error('❌ UserManagement: All user fetch methods failed:', fallbackErr)
        throw new Error(`Cannot fetch users: ${fallbackErr.message}`)
      }
    }
  }

  const fetchTeams = async () => {
    console.log('🔍 UserManagement: Fetching teams...')
    
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name")

      if (error) {
        console.warn('⚠️ UserManagement: Teams fetch failed:', error)
        // Don't throw here, teams are secondary
        setTeams([])
        return
      }

      console.log('✅ UserManagement: Teams fetched:', data?.length || 0)
      setTeams(data || [])
    } catch (err: any) {
      console.warn('⚠️ UserManagement: Teams fetch error:', err)
      setTeams([])
    }
  }

  const handleRefresh = async () => {
    console.log('🔄 UserManagement: Manual refresh triggered')
    setRefreshing(true)
    try {
      await loadAllData()
      toast({
        title: "Refreshed",
        description: `User data refreshed successfully. Found ${allUsers.length} users.`,
      })
    } catch (err: any) {
      toast({
        title: "Refresh Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string, teamId?: string | null) => {
    console.log('🔄 UserManagement: Updating user role:', { userId, newRole, teamId })
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Try main API endpoint first
      let response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          role: newRole,
          team_id: teamId
        })
      })

      let data = await response.json()

      // The main API now has multiple fallback methods including emergency function
      // No need for separate emergency endpoint call

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      // Update local state with the returned user data
      setAllUsers(users => 
        users.map(user => 
          user.id === userId 
            ? { ...user, ...data.user }
            : user
        )
      )

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      })

      setEditingUser(null)
      console.log('✅ UserManagement: User role updated successfully')
      
    } catch (err: any) {
      console.error('❌ UserManagement: Failed to update user role:', err)
      toast({
        title: "Error",
        description: `Failed to update user: ${err.message}`,
        variant: "destructive",
      })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    console.log('🗑️ UserManagement: Deleting user:', userId)
    
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId)

      if (error) {
        throw error
      }

      setAllUsers(users => users.filter(user => user.id !== userId))
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      console.log('✅ UserManagement: User deleted successfully')
      
    } catch (err: any) {
      console.error('❌ UserManagement: Failed to delete user:', err)
      toast({
        title: "Error",
        description: `Failed to delete user: ${err.message}`,
        variant: "destructive",
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive"
      case "manager": return "default"
      case "coach": return "secondary"
      case "player": return "outline"
      case "analyst": return "secondary"
      case "pending_player": return "outline"
      case "awaiting_approval": return "outline"
      default: return "outline"
    }
  }

  const getStatusIcon = (role: string) => {
    switch (role) {
      case "admin":
      case "manager":
      case "coach":
      case "player":
      case "analyst":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending_player":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "awaiting_approval":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const UserTable = ({ users, title }: { users: UserProfile[], title: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title} ({users.length})</span>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Manage user roles and team assignments
          {dataSource && <span className="ml-2 text-xs">• Data source: {dataSource}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-white">No {title.toLowerCase()} found</p>
            <p className="text-gray-500">No users with this provider type</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {getStatusIcon(user.role)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.name || "No name set"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.provider === 'discord' ? (
                      <div className="flex items-center gap-1 text-[#5865F2]">
                        <Bot className="h-4 w-4" />
                        Discord
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {['admin', 'manager'].includes(user.role) 
                      ? "-" 
                      : (teams.find(t => t.id === user.team_id)?.name || "No team")
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading User Management</h3>
            <p className="text-gray-600">Fetching user data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-white">Access Denied</h3>
            <p className="text-gray-600">Admin role required to access user management</p>
            <p className="text-sm text-gray-500 mt-2">Current role: {profile?.role || 'Unknown'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Management</h1>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading user data:</strong> {error}
            <div className="mt-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Main render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">
            Manage user roles and permissions • Total users: {allUsers.length}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ResponsiveTabs 
        tabs={[
          {
            value: "all",
            label: `All Users`,
            badge: allUsers.length,
            icon: Users
          },
          {
            value: "email",
            label: `Email Users`,
            badge: emailUsers.length,
            icon: Mail
          },
          {
            value: "discord",
            label: `Discord Users`,
            badge: discordUsers.length,
            icon: Bot
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="all"
        variant="default"
        size="md"
        responsiveMode="auto"
      >

        <TabsContent value="all" className="space-y-6">
          <UserTable users={allUsers} title="All Users" />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <UserTable users={emailUsers} title="Email Users" />
        </TabsContent>

        <TabsContent value="discord" className="space-y-6">
          <UserTable users={discordUsers} title="Discord Users" />
        </TabsContent>
      </ResponsiveTabs>

      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>Edit User: {editingUser.name || editingUser.email}</CardTitle>
            <CardDescription>Update user role and team assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="pending_player">Pending Player</SelectItem>
                    <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team Assignment</Label>
                {editingUser.role === 'admin' || editingUser.role === 'manager' ? (
                  <div className="p-2 bg-white/10 backdrop-blur-md border-white/20 rounded text-sm text-white/80">
                    Admin and Manager roles don't require team assignment
                  </div>
                ) : (
                  <Select
                    value={editingUser.team_id || "none"}
                    onValueChange={(value) =>
                      setEditingUser({
                        ...editingUser,
                        team_id: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const teamId = editingUser.role === 'admin' || editingUser.role === 'manager' 
                    ? null 
                    : editingUser.team_id
                  updateUserRole(editingUser.id, editingUser.role, teamId)
                }}
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
