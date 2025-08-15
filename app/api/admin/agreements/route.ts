import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { CURRENT_AGREEMENT_VERSIONS } from '@/lib/agreement-versions'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/admin/agreements - Get all agreement content for editing
export async function GET(request: NextRequest) {
  try {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all agreement content from admin_config
    const { data: agreements, error: agreementsError } = await supabase
      .from('admin_config')
      .select('key, value')
      .like('key', 'agreement_content_%')

    if (agreementsError) {
      console.error('Agreements fetch error:', agreementsError)
      return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 })
    }

    // Parse agreement content
    const agreementMap = agreements.reduce((acc, item) => {
      const role = item.key.replace('agreement_content_', '')
      try {
        acc[role] = JSON.parse(item.value)
      } catch (e: unknown) {
        // If parsing fails, create default structure
        acc[role] = {
          role,
          current_version: CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS] || 1,
          title: `${role.charAt(0).toUpperCase() + role.slice(1)} Agreement`,
          content: 'Agreement content not set.'
        }
      }
      return acc
    }, {} as Record<string, { role: string; content: string; lastUpdated: string }>)

    // Ensure all roles have entries
    Object.keys(CURRENT_AGREEMENT_VERSIONS).forEach(role => {
      if (!agreementMap[role]) {
        agreementMap[role] = {
          role,
          current_version: CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS],
          title: `${role.charAt(0).toUpperCase() + role.slice(1)} Agreement v${CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS]}.0`,
          content: `# ${role.charAt(0).toUpperCase() + role.slice(1)} Agreement\n\nPlease define the agreement content for this role.`,
          last_updated: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ agreements: agreementMap })

  } catch (error) {
    console.error('Admin agreements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/agreements - Update agreement content
export async function POST(request: NextRequest) {
  try {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { role, title, content, version } = body

    if (!role || !title || !content || !version) {
      return NextResponse.json({ error: 'Role, title, content, and version are required' }, { status: 400 })
    }

    // Validate role exists in CURRENT_AGREEMENT_VERSIONS
    if (!(role in CURRENT_AGREEMENT_VERSIONS)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Create agreement content object
    const agreementContent = {
      role,
      current_version: version,
      title,
      content,
      last_updated: new Date().toISOString(),
      updated_by: user.id
    }

    // Save to admin_config
    const { error: saveError } = await supabase
      .from('admin_config')
      .upsert({
        key: `agreement_content_${role}`,
        value: JSON.stringify(agreementContent)
      }, { onConflict: 'key' })

    if (saveError) {
      console.error('Agreement save error:', saveError)
      return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Agreement updated successfully',
      agreement: agreementContent
    })

  } catch (error) {
    console.error('Admin agreement update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
