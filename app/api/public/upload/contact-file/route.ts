import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(req: NextRequest) {
  console.log('🔄 Contact file upload request started')
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  
  const supabase = createClient(supabaseUrl, serviceKey)
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    console.log('📁 File info:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type
    })

    if (!file) {
      console.error('❌ No file provided in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes')
      return NextResponse.json({ 
        error: 'File too large. Please upload a file smaller than 10MB.' 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'
    ]
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or PDF file.' 
      }, { status: 400 })
    }

    console.log('🔄 Ensuring contact_files bucket exists...')
    
    // Ensure bucket exists
    await supabase.storage.createBucket('contact_files', { 
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: allowedTypes
    }).catch((error) => {
      console.log('ℹ️  Contact files bucket already exists or creation failed:', error.message)
    })

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'bin'
    const fileName = `contact-${timestamp}-${crypto.randomUUID()}.${fileExt}`
    const filePath = fileName

    console.log('📝 Generated file path:', filePath)
    console.log('🔄 Uploading to Supabase Storage...')

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from('contact_files').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    if (error) {
      console.error('❌ Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ File uploaded successfully:', data)

    // Get public URL for download
    const { data: urlData } = supabase.storage.from('contact_files').getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      console.error('❌ Failed to generate public URL')
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    console.log('🔗 Generated public URL:', urlData.publicUrl)
    console.log('✅ Contact file upload completed successfully')

    return NextResponse.json({ 
      success: true,
      filePath,
      downloadUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    
  } catch (e: any) {
    console.error('❌ Contact file upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}