"use client"

import React, { useState, useEffect } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  User, 
  Gamepad2, 
  Smartphone, 
  Save,
  Edit,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface UserProfile {
  id: string
  full_name?: string
  display_name?: string
  bio?: string
  contact_number?: string
  emergency_contact_name?: string
  emergency_contact_number?: string
  date_of_birth?: string
  address?: string
  instagram_handle?: string
  discord_id?: string
  profile_visibility?: 'public' | 'team' | 'private'
  device_info?: string
  device_model?: string
  ram?: string
  fps?: string
  storage?: string
  gyroscope_enabled?: boolean
  bgmi_tier?: string
  favorite_weapons?: string[]
  gaming_achievements?: string[]
  [key: string]: any
}

interface ProfileSectionProps {
  profile: UserProfile
  canEdit: boolean
  onUpdate: (updates: Partial<any>) => Promise<void>
}

const RequiredBadge = () => (
  <Badge variant="destructive" className="ml-2 text-xs">
    <AlertCircle className="h-3 w-3 mr-1" />
    Required
  </Badge>
)

const AnalyticsBadge = () => (
  <Badge variant="secondary" className="ml-2 text-xs">
    <CheckCircle className="h-3 w-3 mr-1" />
    Analytics
  </Badge>
)

// Personal Information Section
export function PersonalInformationSection({ profile, canEdit, onUpdate }: ProfileSectionProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    contact_number: profile.contact_number || '',
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_number: profile.emergency_contact_number || '',
    date_of_birth: profile.date_of_birth || '',
    address: profile.address || '',
    instagram_handle: profile.instagram_handle || '',
    discord_id: profile.discord_id || '',
    profile_visibility: (profile.profile_visibility as 'public' | 'team' | 'private') || 'team'
  })

  useEffect(() => {
    setFormData({
      full_name: profile.full_name || '',
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      contact_number: profile.contact_number || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_number: profile.emergency_contact_number || '',
      date_of_birth: profile.date_of_birth || '',
      address: profile.address || '',
      instagram_handle: profile.instagram_handle || '',
      discord_id: profile.discord_id || '',
      profile_visibility: (profile.profile_visibility as 'public' | 'team' | 'private') || 'team'
    })
  }, [profile])

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = ['full_name', 'display_name', 'contact_number', 'date_of_birth']
    const missingRequired = requiredFields.filter(field => 
      !formData[field as keyof typeof formData]?.trim()
    )
    
    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingRequired.map(f => f.replace('_', ' ')).join(', ')}`,
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      await onUpdate(formData)
      setIsEditing(false)
      toast({
        title: "Personal Information Updated",
        description: "Your personal information has been saved successfully."
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save personal information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name || '',
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      contact_number: profile.contact_number || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_number: profile.emergency_contact_number || '',
      date_of_birth: profile.date_of_birth || '',
      address: profile.address || '',
      instagram_handle: profile.instagram_handle || '',
      discord_id: profile.discord_id || '',
      profile_visibility: (profile.profile_visibility as 'public' | 'team' | 'private') || 'team'
    })
    setIsEditing(false)
  }

  return (
    <Card className="bg-black/85 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleCancel}
                    variant="outline" 
                    size="sm"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center">
              Full Name
              <RequiredBadge />
            </Label>
            {isEditing ? (
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Your full legal name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.full_name || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name" className="flex items-center">
              Display Name
              <RequiredBadge />
            </Label>
            {isEditing ? (
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Name shown to team members"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.display_name || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="flex items-center">
            Bio
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10 min-h-[80px]">
              {profile.bio || 'No bio provided'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_number" className="flex items-center">
              Contact Number
              <RequiredBadge />
            </Label>
            {isEditing ? (
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.contact_number || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth" className="flex items-center">
              Date of Birth
              <RequiredBadge />
            </Label>
            {isEditing ? (
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name" className="flex items-center">
              Emergency Contact Name
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                placeholder="Emergency contact person's name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.emergency_contact_name || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact_number" className="flex items-center">
              Emergency Contact Number
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="emergency_contact_number"
                value={formData.emergency_contact_number}
                onChange={(e) => setFormData({ ...formData, emergency_contact_number: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.emergency_contact_number || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagram_handle" className="flex items-center">
              Instagram Handle
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="instagram_handle"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                placeholder="@username"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.instagram_handle || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discord_id" className="flex items-center">
              Discord ID
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="discord_id"
                value={formData.discord_id}
                onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
                placeholder="username#1234"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.discord_id || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center">
            Address
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Your address"
              rows={2}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10">
              {profile.address || 'Not set'}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile_visibility" className="flex items-center">
            Profile Visibility
          </Label>
          {isEditing ? (
            <Select
              value={formData.profile_visibility}
              onValueChange={(value: 'public' | 'team' | 'private') => 
                setFormData({ ...formData, profile_visibility: value })
              }
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="team">Team Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10 capitalize">
              {profile.profile_visibility || 'Team Only'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Gaming Information Section
export function GamingInformationSection({ profile, canEdit, onUpdate }: ProfileSectionProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    bgmi_tier: profile.bgmi_tier || '',
    favorite_weapons: profile.favorite_weapons || [],
    gaming_achievements: profile.gaming_achievements || []
  })

  useEffect(() => {
    setFormData({
      bgmi_tier: profile.bgmi_tier || '',
      favorite_weapons: profile.favorite_weapons || [],
      gaming_achievements: profile.gaming_achievements || []
    })
  }, [profile])

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate(formData)
      setIsEditing(false)
      toast({
        title: "Gaming Information Updated",
        description: "Your gaming information has been saved successfully."
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save gaming information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      bgmi_tier: profile.bgmi_tier || '',
      favorite_weapons: profile.favorite_weapons || [],
      gaming_achievements: profile.gaming_achievements || []
    })
    setIsEditing(false)
  }

  return (
    <Card className="bg-black/85 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Gamepad2 className="h-5 w-5" />
            Gaming Information
          </CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleCancel}
                    variant="outline" 
                    size="sm"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bgmi_tier" className="flex items-center">
            BGMI Tier
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Select
              value={formData.bgmi_tier}
              onValueChange={(value) => setFormData({ ...formData, bgmi_tier: value })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select your tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="crown">Crown</SelectItem>
                <SelectItem value="ace">Ace</SelectItem>
                <SelectItem value="conqueror">Conqueror</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10 capitalize">
              {profile.bgmi_tier || 'Not set'}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center">
            Favorite Weapons
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Input
              value={formData.favorite_weapons.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                favorite_weapons: e.target.value.split(',').map(w => w.trim()).filter(w => w) 
              })}
              placeholder="AKM, M416, AWM (comma separated)"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10">
              {profile.favorite_weapons?.length ? profile.favorite_weapons.join(', ') : 'Not set'}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center">
            Gaming Achievements
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Textarea
              value={formData.gaming_achievements.join('\n')}
              onChange={(e) => setFormData({ 
                ...formData, 
                gaming_achievements: e.target.value.split('\n').map(a => a.trim()).filter(a => a) 
              })}
              placeholder="List your gaming achievements (one per line)"
              rows={4}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10 min-h-[100px]">
              {profile.gaming_achievements?.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {profile.gaming_achievements.map((achievement, index) => (
                    <li key={index}>{achievement}</li>
                  ))}
                </ul>
              ) : (
                'No achievements added'
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Device Information Section
export function DeviceInformationSection({ profile, canEdit, onUpdate }: ProfileSectionProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    device_info: profile.device_info || '',
    device_model: profile.device_model || '',
    ram: profile.ram || '',
    fps: profile.fps || '',
    storage: profile.storage || '',
    gyroscope_enabled: profile.gyroscope_enabled ?? true
  })

  useEffect(() => {
    setFormData({
      device_info: profile.device_info || '',
      device_model: profile.device_model || '',
      ram: profile.ram || '',
      fps: profile.fps || '',
      storage: profile.storage || '',
      gyroscope_enabled: profile.gyroscope_enabled ?? true
    })
  }, [profile])

  const handleSave = async () => {
    // Validate required device field
    if (!formData.device_model?.trim()) {
      toast({
        title: "Missing Required Field",
        description: "Device Model is required for performance analysis",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      await onUpdate(formData)
      setIsEditing(false)
      toast({
        title: "Device Information Updated",
        description: "Your device information has been saved successfully."
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save device information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      device_info: profile.device_info || '',
      device_model: profile.device_model || '',
      ram: profile.ram || '',
      fps: profile.fps || '',
      storage: profile.storage || '',
      gyroscope_enabled: profile.gyroscope_enabled ?? true
    })
    setIsEditing(false)
  }

  return (
    <Card className="bg-black/85 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Smartphone className="h-5 w-5" />
            Device Information
          </CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleCancel}
                    variant="outline" 
                    size="sm"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="device_model" className="flex items-center">
            Device Model
            <RequiredBadge />
          </Label>
          {isEditing ? (
            <Input
              id="device_model"
              value={formData.device_model}
              onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
              placeholder="iPhone 14 Pro, Samsung Galaxy S23, etc."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10">
              {profile.device_model || 'Not set'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ram" className="flex items-center">
              RAM
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="ram"
                value={formData.ram}
                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                placeholder="8GB, 12GB, etc."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.ram || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fps" className="flex items-center">
              FPS Setting
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Select
                value={formData.fps}
                onValueChange={(value) => setFormData({ ...formData, fps: value })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select FPS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                  <SelectItem value="90">90 FPS</SelectItem>
                  <SelectItem value="120">120 FPS</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.fps ? `${profile.fps} FPS` : 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage" className="flex items-center">
              Storage
              <AnalyticsBadge />
            </Label>
            {isEditing ? (
              <Input
                id="storage"
                value={formData.storage}
                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                placeholder="128GB, 256GB, etc."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            ) : (
              <div className="p-3 bg-white/5 rounded-md border border-white/10">
                {profile.storage || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="device_info" className="flex items-center">
            Additional Device Information
            <AnalyticsBadge />
          </Label>
          {isEditing ? (
            <Textarea
              id="device_info"
              value={formData.device_info}
              onChange={(e) => setFormData({ ...formData, device_info: e.target.value })}
              placeholder="Any additional device specifications or notes"
              rows={3}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          ) : (
            <div className="p-3 bg-white/5 rounded-md border border-white/10 min-h-[80px]">
              {profile.device_info || 'No additional information'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="space-y-1">
            <Label htmlFor="gyroscope_enabled" className="text-sm font-medium">
              Gyroscope Enabled
            </Label>
            <p className="text-xs text-white/60">
              Enable gyroscope for better aim control
            </p>
          </div>
          {isEditing ? (
            <Switch
              id="gyroscope_enabled"
              checked={formData.gyroscope_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, gyroscope_enabled: checked })}
            />
          ) : (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              profile.gyroscope_enabled 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {profile.gyroscope_enabled ? 'Enabled' : 'Disabled'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}