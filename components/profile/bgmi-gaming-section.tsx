"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserProfile, BGMI_TIERS, CONTROL_LAYOUTS, formatBGMITier, DEFAULT_SENSITIVITY_SETTINGS } from '@/lib/profile-utils'
import { 
  Target, 
  Trophy, 
  Gamepad2, 
  Settings, 
  Award,
  TrendingUp,
  Clock,
  Zap,
  Copy,
  Check,
  Edit,
  Save,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BGMIGamingSectionProps {
  profile: UserProfile
  isEditing: boolean
  canEdit: boolean
  onUpdate: (updates: Partial<UserProfile>) => void
}

export function BGMIGamingSection({ profile, isEditing, canEdit, onUpdate }: BGMIGamingSectionProps) {
  const { toast } = useToast()
  const [localData, setLocalData] = useState({
    bgmi_id: profile.bgmi_id || '',
    bgmi_tier: (profile.bgmi_tier as any) || '',
    bgmi_points: profile.bgmi_points || 0,
    preferred_role: profile.preferred_role || '',
    in_game_role: profile.in_game_role || '',
    control_layout: (profile.control_layout as any) || '',
    hud_layout_code: profile.hud_layout_code || '',
    sensitivity_settings: profile.sensitivity_settings || DEFAULT_SENSITIVITY_SETTINGS,
    game_stats: profile.game_stats || {},
    achievements: profile.achievements || []
  })
  
  const [copiedHUD, setCopiedHUD] = useState(false)
  
  const gameStats = localData.game_stats as any || {}
  const achievements = localData.achievements as any[] || []
  
  const copyHUDCode = async () => {
    if (localData.hud_layout_code) {
      await navigator.clipboard.writeText(localData.hud_layout_code)
      setCopiedHUD(true)
      toast({
        title: "HUD Code Copied",
        description: "Layout code copied to clipboard"
      })
      setTimeout(() => setCopiedHUD(false), 2000)
    }
  }
  
  const handleSave = () => {
    onUpdate(localData)
  }
  
  const handleCancel = () => {
    setLocalData({
      bgmi_id: profile.bgmi_id || '',
      bgmi_tier: (profile.bgmi_tier as any) || '',
      bgmi_points: profile.bgmi_points || 0,
      preferred_role: profile.preferred_role || '',
      in_game_role: profile.in_game_role || '',
      control_layout: (profile.control_layout as any) || '',
      hud_layout_code: profile.hud_layout_code || '',
      sensitivity_settings: profile.sensitivity_settings || DEFAULT_SENSITIVITY_SETTINGS,
      game_stats: profile.game_stats || {},
      achievements: profile.achievements || []
    })
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* BGMI Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">BGMI Profile</CardTitle>
          </div>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" className="ml-auto">
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bgmi_id">BGMI ID</Label>
                  <Input
                    id="bgmi_id"
                    value={localData.bgmi_id}
                    onChange={(e) => setLocalData({ ...localData, bgmi_id: e.target.value })}
                    placeholder="Enter your BGMI ID"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bgmi_points">Current Points</Label>
                  <Input
                    id="bgmi_points"
                    type="number"
                    value={localData.bgmi_points}
                    onChange={(e) => setLocalData({ ...localData, bgmi_points: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bgmi_tier">Current Tier</Label>
                <Select 
                  value={localData.bgmi_tier} 
                  onValueChange={(value) => setLocalData({ ...localData, bgmi_tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your BGMI tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {BGMI_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {formatBGMITier(tier)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_role">Preferred Role</Label>
                  <Input
                    id="preferred_role"
                    value={localData.preferred_role}
                    onChange={(e) => setLocalData({ ...localData, preferred_role: e.target.value })}
                    placeholder="e.g., IGL, Fragger, Support"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in_game_role">Current Role</Label>
                  <Input
                    id="in_game_role"
                    value={localData.in_game_role}
                    onChange={(e) => setLocalData({ ...localData, in_game_role: e.target.value })}
                    placeholder="e.g., Entry Fragger"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">BGMI ID</p>
                  <p className="font-mono text-lg">{profile.bgmi_id || 'Not set'}</p>
                </div>
                {profile.bgmi_tier && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {formatBGMITier(profile.bgmi_tier as any)}
                  </Badge>
                )}
              </div>
              
              {profile.bgmi_points && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">Current Points:</span>
                  <span className="font-bold text-green-600">{profile.bgmi_points.toLocaleString()}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Preferred Role</p>
                  <p className="font-medium">{profile.preferred_role || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Role</p>
                  <p className="font-medium">{profile.in_game_role || 'Not specified'}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controls & Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Controls & Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="control_layout">Control Layout</Label>
                <Select 
                  value={localData.control_layout} 
                  onValueChange={(value) => setLocalData({ ...localData, control_layout: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select control layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_LAYOUTS.map((layout) => (
                      <SelectItem key={layout} value={layout}>
                        {layout} Controls
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hud_layout_code">HUD Layout Code</Label>
                <Textarea
                  id="hud_layout_code"
                  value={localData.hud_layout_code}
                  onChange={(e) => setLocalData({ ...localData, hud_layout_code: e.target.value })}
                  placeholder="Paste your BGMI HUD layout code here..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Control Layout:</span>
                <Badge variant="outline">
                  {profile.control_layout ? `${profile.control_layout} Controls` : 'Not set'}
                </Badge>
              </div>
              
              {profile.hud_layout_code && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">HUD Layout Code</span>
                    <Button 
                      onClick={copyHUDCode}
                      variant="outline" 
                      size="sm"
                      className="h-6 px-2"
                    >
                      {copiedHUD ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm border border-white/20 p-2 rounded text-xs font-mono break-all text-white/90">
                    {profile.hud_layout_code}
                  </div>
                </div>
              )}
              
              {profile.gyroscope_enabled !== null && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Gyroscope:</span>
                  <Badge variant={profile.gyroscope_enabled ? "default" : "secondary"}>
                    {profile.gyroscope_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Game Statistics */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">Game Statistics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(gameStats).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {gameStats.matches_played && (
                <div>
                  <p className="text-gray-600">Matches Played</p>
                  <p className="text-lg font-bold">{gameStats.matches_played.toLocaleString()}</p>
                </div>
              )}
              {gameStats.wins && (
                <div>
                  <p className="text-gray-600">Wins</p>
                  <p className="text-lg font-bold text-green-600">{gameStats.wins.toLocaleString()}</p>
                </div>
              )}
              {gameStats.kd_ratio && (
                <div>
                  <p className="text-gray-600">K/D Ratio</p>
                  <p className="text-lg font-bold text-blue-600">{gameStats.kd_ratio.toFixed(2)}</p>
                </div>
              )}
              {gameStats.win_rate && (
                <div>
                  <p className="text-gray-600">Win Rate</p>
                  <p className="text-lg font-bold text-purple-600">{gameStats.win_rate.toFixed(1)}%</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No game statistics available</p>
              <p className="text-xs">Stats will be updated after matches</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Achievements</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="space-y-2">
              {achievements.map((achievement: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-black/60 backdrop-blur-sm border border-white/20 rounded shadow-lg">
                  <Award className="h-4 w-4 text-yellow-400" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white drop-shadow-md">{achievement.title}</p>
                    {achievement.date && (
                                              <p className="text-xs text-white/70 drop-shadow-sm">{new Date(achievement.date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No achievements yet</p>
              <p className="text-xs">Achievements will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
