"use client"

import React, { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { ProfileHeader } from "@/components/profile/profile-header"
import { BGMIGamingSection } from "@/components/profile/bgmi-gaming-section"
import { ProfileSearch } from "@/components/profile/profile-search"
import { PersonalInformationSection, GamingInformationSection, DeviceInformationSection } from "@/components/profile/profile-sections"
import { UserProfile, canViewProfile, canEditProfile } from "@/lib/profile-utils"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Gamepad2, 
  Smartphone, 
  Users, 
  Settings, 
  Search,
  Shield,
  AlertCircle
} from "lucide-react"

export default function ProfilePage() {
  const { profile: currentProfile, updateProfile, getToken } = useAuth()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user')
  const { toast } = useToast()

  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("personal")

  // Profile to display - either target user or current user
  const displayProfile = targetProfile || currentProfile
  const isOwnProfile = !targetUserId || targetUserId === currentProfile?.id

  // Permissions
  const canView = displayProfile && currentProfile ? canViewProfile(
    currentProfile.role as any,
    currentProfile.team_id,
    displayProfile.id,
    displayProfile.team_id,
    displayProfile.profile_visibility as any,
    currentProfile.id
  ) : false
  const canEdit = displayProfile && currentProfile ? canEditProfile(
    currentProfile.role as any,
    currentProfile.team_id,
    displayProfile.id,
    displayProfile.team_id,
    currentProfile.id
  ) : false
  const canSearchAll = ['admin', 'manager'].includes(currentProfile?.role || '')

  // Load target profile if specified
  useEffect(() => {
    const loadTargetProfile = async () => {
      if (!targetUserId || targetUserId === currentProfile?.id) {
        setTargetProfile(null)
        return
      }

      if (!currentProfile) return

      setLoading(true)
      setError(null)

      try {
        const token = await getToken()
        if (!token) throw new Error('No authentication token')

        const response = await fetch(`/api/profile?userId=${targetUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        setTargetProfile(data.profile)
      } catch (error: any) {
        console.error('Failed to load target profile:', error)
        setError(error.message)
        toast({
          title: 'Profile Load Failed',
          description: error.message,
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadTargetProfile()
  }, [targetUserId, currentProfile, getToken, toast])

  // Handle profile updates
  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!displayProfile || !currentProfile) return

    try {
      setLoading(true)

      const token = await getToken()
      if (!token) throw new Error('No authentication token')

      console.log('Sending profile update:', { 
        userId: displayProfile.id, 
        updates,
        currentUserRole: currentProfile.role,
        canEdit: canEdit,
        isOwnProfile
      })
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: displayProfile.id,
          updates
        })
      })
      
      const data = await response.json()
      console.log('API response:', data)
      console.log('Updated profile data:', data.profile)
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (isOwnProfile) {
        // Update current profile in auth context
        await updateProfile(data.profile)
        // For own profile, also update targetProfile if it exists
        if (targetProfile) {
          setTargetProfile(data.profile)
        }
      } else {
        setTargetProfile(data.profile)
      }
      
    } catch (error: any) {
      console.error('Profile update failed:', error)
      throw error // Re-throw so the section component can handle it
    } finally {
      setLoading(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (loading && !displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white">Loading target profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-red-900/40 backdrop-blur-lg border border-red-400/60 shadow-xl text-white rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200 drop-shadow-md">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!displayProfile || !canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-yellow-900/40 backdrop-blur-lg border border-yellow-400/60 shadow-xl text-white rounded-lg">
          <Shield className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200 drop-shadow-md">
            You don't have permission to view this profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <ProfileHeader 
        profile={displayProfile} 
        viewerProfile={currentProfile}
        onEdit={() => setActiveTab('personal')}
        isEditing={false}
        showAvatarUpload={isOwnProfile && canEdit}
      />

      {/* Profile Sections */}
      <ResponsiveTabs
        tabs={[
          {
            value: "personal",
            label: "Personal Info",
            icon: User
          },
          {
            value: "gaming", 
            label: "Gaming Info",
            icon: Gamepad2
          },
          {
            value: "device",
            label: "Device Info", 
            icon: Smartphone
          },
          {
            value: "bgmi",
            label: "BGMI Profile",
            icon: Gamepad2
          },
          {
            value: "search",
            label: "Search Profiles",
            icon: Search,
            hidden: !canSearchAll
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="personal"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="w-full"
      >
        {/* Personal Information Section */}
        <TabsContent value="personal" className="space-y-6">
          <PersonalInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Gaming Information Section */}
        <TabsContent value="gaming" className="space-y-6">
          <GamingInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Device Information Section */}
        <TabsContent value="device" className="space-y-6">
          <DeviceInformationSection
            profile={displayProfile}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* BGMI Gaming Section */}
        <TabsContent value="bgmi" className="space-y-6">
          <BGMIGamingSection 
            profile={displayProfile}
            isEditing={false}
            canEdit={canEdit}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Profile Search Section */}
        <TabsContent value="search" className="space-y-6">
          <ProfileSearch />
        </TabsContent>
      </ResponsiveTabs>
    </div>
  )
}
