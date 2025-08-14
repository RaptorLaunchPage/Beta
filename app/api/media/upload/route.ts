import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(req: NextRequest) {
  console.log('🔄 Media upload request started')
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  
  const supabase = createClient(supabaseUrl, serviceKey)
  
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const folder = (form.get('folder') as string) || ''

    console.log('📁 File info:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      folder 
    })

    if (!file) {
      console.error('❌ No file provided in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes')
      return NextResponse.json({ 
        error: 'File too large. Please upload a file smaller than 20MB.' 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'application/pdf', 'text/plain'
    ]
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload an image, video, PDF, or text file.' 
      }, { status: 400 })
    }

    console.log('🔄 Ensuring media bucket exists...')
    
    // Ensure bucket exists
    await supabase.storage.createBucket('media', { 
      public: true,
      fileSizeLimit: 20971520, // 20MB
      allowedMimeTypes: allowedTypes
    }).catch((error) => {
      console.log('ℹ️  Media bucket already exists or creation failed:', error.message)
    })

    const ext = file.name.split('.').pop() || 'bin'
    const name = `${crypto.randomUUID()}.${ext}`
    const path = folder ? `${folder}/${name}` : name

    console.log('📝 Generated file path:', path)
    console.log('🔄 Uploading to Supabase Storage...')

    const { data, error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    if (error) {
      console.error('❌ Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ File uploaded successfully:', data)

    // Public URL
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path)

    if (!pub?.publicUrl) {
      console.error('❌ Failed to generate public URL')
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    console.log('🔗 Generated public URL:', pub.publicUrl)
    console.log('✅ Media upload completed successfully')

    return NextResponse.json({ 
      path, 
      url: pub.publicUrl, 
      name: file.name, 
      size: file.size, 
      type: file.type 
    })
    
  } catch (e: any) {
    console.error('❌ Media upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}