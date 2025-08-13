"use client"

import React, { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { 
  Upload, 
  X, 
  Camera, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { GLOBAL_THEME } from '@/lib/global-theme'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userId?: string
  userName?: string
  canEdit?: boolean
  onAvatarUpdate?: (newAvatarUrl: string) => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const AVATAR_SIZES = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24', 
  lg: 'h-32 w-32',
  xl: 'h-40 w-40'
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  userId, 
  userName, 
  canEdit = true, 
  onAvatarUpdate,
  size = 'lg' 
}: AvatarUploadProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image'
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 5MB'
    }

    return null
  }

  const handleFileSelect = async (file: File) => {
    const validation = validateFile(file)
    if (validation) {
      toast({
        title: "Invalid File",
        description: validation,
        variant: "destructive"
      })
      return
    }

    // Create preview URL
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)

    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (!canEdit) return

    setUploading(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('avatar', file)
      if (userId) {
        formData.append('userId', userId)
      }

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully",
        variant: "default"
      })

      // Notify parent component to update avatar URL
      if (onAvatarUpdate) {
        onAvatarUpdate(data.avatar_url)
      }

    } catch (error: any) {
      console.error('Avatar upload error:', error)
      
      // Clean up preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload avatar',
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!canEdit || (!currentAvatarUrl && !previewUrl)) return

    setRemoving(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const url = new URL('/api/profile/avatar', window.location.origin)
      if (userId) {
        url.searchParams.set('userId', userId)
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Remove failed')
      }

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed",
        variant: "default"
      })

      // Notify parent component to remove avatar URL
      if (onAvatarUpdate) {
        onAvatarUpdate('')
      }

    } catch (error: any) {
      console.error('Avatar removal error:', error)
      toast({
        title: "Remove Failed",
        description: error.message || 'Failed to remove avatar',
        variant: "destructive"
      })
    } finally {
      setRemoving(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (canEdit) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (!canEdit) return

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleFileSelect(imageFile)
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop an image file",
        variant: "destructive"
      })
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const displayUrl = previewUrl || currentAvatarUrl

  return (
    <Card className={`${GLOBAL_THEME.cards.standard} overflow-hidden`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar Display */}
          <div 
            className={`relative ${AVATAR_SIZES[size]} group cursor-pointer`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => canEdit && fileInputRef.current?.click()}
          >
            <Avatar className={`${AVATAR_SIZES[size]} border-4 border-white/30 shadow-xl transition-all duration-200 ${dragOver ? 'scale-105 border-blue-400/60' : ''}`}>
              <AvatarImage 
                src={displayUrl || undefined} 
                className="object-cover"
              />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {/* Upload Overlay */}
            {canEdit && (
              <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${dragOver ? 'opacity-100' : ''}`}>
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            )}

            {/* Upload Progress Indicator */}
            {uploading && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Uploading...</span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Instructions */}
          {canEdit && !uploading && (
            <div className="text-center space-y-2">
              <p className="text-sm text-white/80">
                Click to upload or drag & drop an image
              </p>
              <p className="text-xs text-white/60">
                JPEG, PNG, WebP • Max 5MB
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || removing}
                className={GLOBAL_THEME.buttons.outline}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>

              {(displayUrl || previewUrl) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploading || removing}
                  className="border-red-400/50 text-red-200 hover:bg-red-900/20"
                >
                  {removing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={!canEdit}
          />

          {/* Status Messages */}
          {!canEdit && (
            <div className="flex items-center space-x-2 text-sm text-white/60">
              <AlertCircle className="h-4 w-4" />
              <span>You don't have permission to edit this avatar</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}