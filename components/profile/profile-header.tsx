"use client"

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { 
  UserProfile, 
  formatBGMITier, 
  calculateProfileCompletion, 
  getProfileStatus,
  canEditProfile 
} from '@/lib/profile-utils'
import { 
  Edit, 
  Shield, 
  Crown, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Instagram,
  MessageSquare,
  Settings,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react'

interface ProfileHeaderProps {
  profile: UserProfile
  viewerProfile: UserProfile
  onEdit?: () => void
  isEditing?: boolean
  showAvatarUpload?: boolean
}

export function ProfileHeader({ profile, viewerProfile, onEdit, isEditing, showAvatarUpload = false }: ProfileHeaderProps) {
  const completion = calculateProfileCompletion(profile)
  const status = getProfileStatus(profile)
  const canEdit = canEditProfile(
    viewerProfile.role as any,
    viewerProfile.team_id,
    profile.id,
    profile.team_id,
    viewerProfile.id
  )
  
  const isOwnProfile = viewerProfile.id === profile.id
  
  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'manager': return <Crown className="h-4 w-4" />
      case 'coach': return <Users className="h-4 w-4" />
      default: return null
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
  
  const getVisibilityIcon = (visibility: string | null) => {
    switch (visibility) {
      case 'public': return <Globe className="h-4 w-4" />
      case 'team': return <Users className="h-4 w-4" />
      case 'private': return <EyeOff className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-10" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar and basic info */}
          <div className="flex-shrink-0">
            {showAvatarUpload && canEdit ? (
              <div className="relative">
                <AvatarUpload
                  currentAvatarUrl={profile.avatar_url}
                  userId={profile.id}
                  userName={profile.display_name || profile.full_name || profile.name || 'User'}
                  canEdit={canEdit}
                  size="lg"
                />
                
                {/* BGMI Tier Badge */}
                {profile.bgmi_tier && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                    <div className="text-xs font-bold text-center">
                      {formatBGMITier(profile.bgmi_tier as any)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getInitials(profile.display_name || profile.full_name || profile.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* BGMI Tier Badge */}
                {profile.bgmi_tier && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                    <div className="text-xs font-bold text-center">
                      {formatBGMITier(profile.bgmi_tier as any)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                    {profile.display_name || profile.full_name || profile.name || 'Unknown User'}
                  </h1>
                  {profile.bgmi_id && (
                    <Badge variant="outline" className="font-mono text-xs">
                      ID: {profile.bgmi_id}
                    </Badge>
                  )}
                </div>
                
                {profile.full_name && profile.display_name && profile.full_name !== profile.display_name && (
                  <p className="text-gray-600 text-lg">{profile.full_name}</p>
                )}
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getRoleColor(profile.role)} text-white`}>
                    {getRoleIcon(profile.role)}
                    <span className="ml-1 capitalize">{profile.role.replace('_', ' ')}</span>
                  </Badge>
                  
                  {profile.team_id && (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Team Member
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className={`text-${status.color}-600 border-${status.color}-300`}>
                    {getVisibilityIcon(profile.profile_visibility)}
                    <span className="ml-1 capitalize">{profile.profile_visibility || 'team'}</span>
                  </Badge>
                </div>
                
                {profile.bio && (
                  <p className="text-gray-700 max-w-2xl">{profile.bio}</p>
                )}
                
                {/* Contact info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {profile.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  
                  {profile.contact_number && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{profile.contact_number}</span>
                    </div>
                  )}
                  
                  {profile.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Social links */}
                <div className="flex gap-2">
                  {profile.instagram_handle && (
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Instagram className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {profile.discord_id && (
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2 md:items-end">
                {canEdit && onEdit && viewerProfile.role !== 'player' && (
                  <Button 
                    onClick={onEdit}
                    variant={isEditing ? "secondary" : "default"}
                    size="sm"
                    className="w-full md:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Cancel Edit' : (isOwnProfile ? 'Edit Profile' : 'Edit User')}
                  </Button>
                )}
                
                {isOwnProfile && viewerProfile.role !== 'player' && (
                  <Button variant="outline" size="sm" className="w-full md:w-auto">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
              </div>
            </div>
            
            {/* Profile completion */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Profile Completion</span>
                <span className={`font-medium text-${status.color}-600`}>
                  {completion}% • {status.message}
                </span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
