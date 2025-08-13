"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserProfile, formatBGMITier } from '@/lib/profile-utils'
import { 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  Eye,
  Edit,
  Crown,
  Shield,
  Target
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'

interface ProfileSearchProps {
  onSelectProfile: (profile: UserProfile) => void
  currentUserRole: string
}

interface SearchResult {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  role: string
  team_id: string | null
  bgmi_id: string | null
  bgmi_tier: string | null
  bgmi_points: number | null
  status: string | null
  avatar_url: string | null
  last_login: string | null
  created_at: string
  team?: { id: string; name: string; tier: string } | null
  profile_visibility: string | null
  onboarding_completed: boolean | null
}

export function ProfileSearch() {
  const { toast } = useToast()
  const { getToken, profile: currentProfile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  
  const canSearchAll = currentProfile && ['admin', 'manager'].includes(currentProfile.role || '')
  
  const searchProfiles = async () => {
    if (!canSearchAll) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to search profiles",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) {
        // Handle token refresh gracefully without redirecting
        toast({
          title: "Session Expired",
          description: "Please refresh the page to continue",
          variant: "destructive"
        })
        setLoading(false)
        return
      }
      
      const params = new URLSearchParams({
        limit: '20',
        offset: '0'
      })
      
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/profile/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page.')
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to search profiles.')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed (${response.status})`)
      }
      
      const data = await response.json()
      setResults(data.profiles || [])
      setTotal(data.total || 0)
      
    } catch (error: any) {
      console.error('Profile search error:', error)
      toast({
        title: "Search Error",
        description: error.message || "Failed to search profiles",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (canSearchAll) {
      searchProfiles()
    }
  }, [roleFilter, statusFilter])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchProfiles()
  }
  
  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getDisplayName = (profile: SearchResult) => {
    return profile.display_name || profile.full_name || 'User'
  }
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'manager': return <Crown className="h-4 w-4" />
      case 'coach': return <Users className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500'
      case 'manager': return 'bg-purple-500'
      case 'coach': return 'bg-blue-500'
      case 'analyst': return 'bg-green-500'
      case 'player': return 'bg-orange-500'
      case 'pending_player': return 'bg-yellow-500'
      case 'tryout': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  if (!canSearchAll) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            Only administrators and managers can search and view all user profiles.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          User Profile Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or BGMI ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="pending_player">Pending Player</SelectItem>
                <SelectItem value="tryout">Tryout</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Benched">Benched</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        
        {/* Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} users found</span>
            {loading && <span>Searching...</span>}
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {results.map((profile) => (
              <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {getInitials(getDisplayName(profile))}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">
                          {getDisplayName(profile)}
                        </h4>
                        {profile.bgmi_tier && (
                          <Badge variant="outline" className="text-xs">
                            {formatBGMITier(profile.bgmi_tier as any)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getRoleColor(profile.role)} text-white text-xs`}>
                          {getRoleIcon(profile.role)}
                          <span className="ml-1 capitalize">{profile.role.replace('_', ' ')}</span>
                        </Badge>
                        
                        {profile.team && (
                          <Badge variant="outline" className="text-xs">
                            {profile.team.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-32">{profile.email}</span>
                        </div>
                        
                        {profile.bgmi_id && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>ID: {profile.bgmi_id}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Navigate to profile view without causing auth redirects
                          window.location.href = `/dashboard/profile?user=${profile.id}`
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Navigate to profile edit without causing auth redirects
                          window.location.href = `/dashboard/profile?user=${profile.id}&tab=personal`
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No profiles found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
