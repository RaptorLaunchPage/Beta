import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Create admin client for storage operations - with environment check
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      serviceKey: !!serviceRoleKey
    })
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// POST /api/profile/avatar - Upload avatar image
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Avatar upload request started')
    
    const { user, profile } = await getUser(request)
    
    if (!user || !profile) {
      console.error('❌ Unauthorized avatar upload attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', { userId: user.id, role: profile.role })

    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
      console.log('✅ Supabase admin client created')
    } catch (error) {
      console.error('❌ Failed to create Supabase admin client:', error)
      return NextResponse.json({ 
        error: 'Service temporarily unavailable' 
      }, { status: 503 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    const targetUserId = formData.get('userId') as string || profile.id
    
    console.log('📁 File info:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      targetUserId 
    })
    
    if (!file) {
      console.error('❌ No file provided in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' 
      }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes')
      return NextResponse.json({ 
        error: 'File too large. Please upload an image smaller than 5MB.' 
      }, { status: 400 })
    }

    // Check permissions - users can only upload their own avatar unless admin/manager
    if (targetUserId !== profile.id && !['admin', 'manager'].includes(profile.role)) {
      console.error('❌ Permission denied for avatar upload:', { 
        targetUserId, 
        profileId: profile.id, 
        role: profile.role 
      })
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${targetUserId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    console.log('📝 Generated file path:', filePath)

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    console.log('🔄 Uploading to Supabase Storage...')

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload image: ' + uploadError.message
      }, { status: 500 })
    }

    console.log('✅ File uploaded successfully:', uploadData)

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      console.error('❌ Failed to generate public URL')
      return NextResponse.json({ 
        error: 'Failed to generate image URL' 
      }, { status: 500 })
    }

    console.log('🔗 Generated public URL:', urlData.publicUrl)

    // Update user's avatar_url in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      
      // Try to clean up uploaded file
      try {
        await supabaseAdmin.storage
          .from('avatars')
          .remove([filePath])
        console.log('🧹 Cleaned up uploaded file after DB error')
      } catch (cleanupError) {
        console.error('❌ Failed to clean up file:', cleanupError)
      }
        
      return NextResponse.json({ 
        error: 'Failed to update profile: ' + updateError.message
      }, { status: 500 })
    }

    console.log('✅ Avatar upload completed successfully')

    return NextResponse.json({
      success: true,
      avatar_url: urlData.publicUrl,
      user: updatedUser,
      message: 'Avatar updated successfully'
    })

  } catch (error: any) {
    console.error('❌ Avatar upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message
    }, { status: 500 })
  }
}

// DELETE /api/profile/avatar - Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 Avatar removal request started')
    
    const { user, profile } = await getUser(request)
    
    if (!user || !profile) {
      console.error('❌ Unauthorized avatar removal attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch (error) {
      console.error('❌ Failed to create Supabase admin client:', error)
      return NextResponse.json({ 
        error: 'Service temporarily unavailable' 
      }, { status: 503 })
    }
    
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || profile.id
    
    // Check permissions
    if (targetUserId !== profile.id && !['admin', 'manager'].includes(profile.role)) {
      console.error('❌ Permission denied for avatar removal')
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get current avatar URL to extract file path
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', targetUserId)
      .single()

    // Update database to remove avatar_url
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to remove avatar: ' + updateError.message
      }, { status: 500 })
    }

    // Try to remove file from storage (best effort)
    if (currentUser?.avatar_url) {
      try {
        const url = new URL(currentUser.avatar_url)
        const pathSegments = url.pathname.split('/')
        const fileName = pathSegments[pathSegments.length - 1]
        const filePath = `avatars/${fileName}`
        
        await supabaseAdmin.storage
          .from('avatars')
          .remove([filePath])
        
        console.log('🧹 Removed old avatar file:', filePath)
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up old avatar file:', cleanupError)
        // Don't fail the request if cleanup fails
      }
    }

    console.log('✅ Avatar removal completed successfully')

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Avatar removed successfully'
    })

  } catch (error: any) {
    console.error('❌ Avatar removal error:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message
    }, { status: 500 })
  }
}