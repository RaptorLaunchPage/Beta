import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function DELETE(req: NextRequest) {
  console.log('🔄 Media delete request started')
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase environment variables')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  
  const supabase = createClient(supabaseUrl, serviceKey)
  
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path')
    
    console.log('🗑️  Delete request for path:', path)
    
    if (!path) {
      console.error('❌ No path provided in request')
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }
    
    console.log('🔄 Deleting from Supabase Storage...')
    
    const { error } = await supabase.storage.from('media').remove([path])
    
    if (error) {
      console.error('❌ Storage delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log('✅ File deleted successfully')
    
    return NextResponse.json({ success: true })
    
  } catch (e: any) {
    console.error('❌ Media delete error:', e)
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}