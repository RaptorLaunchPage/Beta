import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const supabase = createClient(supabaseUrl, serviceKey)
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const folder = (form.get('folder') as string) || ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Ensure bucket exists
    await supabase.storage.createBucket('media', { public: true }).catch(() => {})

    const ext = file.name.split('.').pop() || 'bin'
    const name = `${crypto.randomUUID()}.${ext}`
    const path = folder ? `${folder}/${name}` : name

    const { data, error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Public URL
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path)

    return NextResponse.json({ path, url: pub.publicUrl, name: file.name, size: file.size, type: file.type })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}