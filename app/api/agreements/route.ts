import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { CURRENT_AGREEMENT_VERSIONS, getRequiredAgreementVersion } from '@/lib/agreement-versions'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/agreements - Get user's agreement status
export async function GET(request: NextRequest) {
  try {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = userData.role
    const requiredVersion = getRequiredAgreementVersion(userRole)

    // Check agreement status using database function
    const { data: statusData, error: statusError } = await supabase
      .rpc('check_user_agreement_status', {
        p_user_id: user.id,
        p_role: userRole,
        p_required_version: requiredVersion
      })

    if (statusError) {
      console.error('Agreement status check error:', statusError)
      return NextResponse.json({ error: 'Failed to check agreement status' }, { status: 500 })
    }

    return NextResponse.json({
      user_id: user.id,
      role: userRole,
      agreement_status: statusData
    })

  } catch (error) {
    console.error('Agreement status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agreements - Accept agreement
export async function POST(request: NextRequest) {
  try {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { role, version, status = 'accepted' } = body

    if (!role || !version) {
      return NextResponse.json({ error: 'Role and version are required' }, { status: 400 })
    }

    // Validate that the version matches current requirement
    const requiredVersion = getRequiredAgreementVersion(role)
    if (version !== requiredVersion) {
      return NextResponse.json({ 
        error: 'Invalid version', 
        required_version: requiredVersion 
      }, { status: 400 })
    }

    // Get client IP and user agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Insert or update agreement
    const { data: agreementData, error: agreementError } = await supabase
      .from('user_agreements')
      .upsert({
        user_id: user.id,
        role,
        agreement_version: version,
        status,
        ip_address: ip,
        user_agent: userAgent,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,role'
      })
      .select()
      .single()

    if (agreementError) {
      console.error('Agreement save error:', agreementError)
      return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Agreement processed successfully',
      agreement: agreementData
    }, { status: 201 })

  } catch (error) {
    console.error('Agreement acceptance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
