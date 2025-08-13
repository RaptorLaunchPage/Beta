import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { CURRENT_AGREEMENT_VERSIONS } from '@/lib/agreement-versions'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Default fallback content
const DEFAULT_AGREEMENT_CONTENT = {
  player: {
    role: 'player',
    current_version: 2,
    title: 'Player Agreement v2.0',
    last_updated: 'January 2025',
    content: `# Raptors Esports Player Agreement

## 1. Commitment and Expectations
As a player for Raptors Esports, you agree to:
- Maintain regular attendance for scheduled practice sessions
- Participate professionally in tournaments and matches
- Represent the organization with integrity and sportsmanship
- Follow team communication protocols and guidelines

## 2. Performance Standards
- Maintain consistent performance metrics as defined by coaching staff
- Participate in performance reviews and improvement programs
- Adhere to practice schedules and team strategies
- Report any issues affecting gameplay or team dynamics

## 3. Code of Conduct
- Treat all team members, opponents, and staff with respect
- Avoid toxic behavior in games and communications
- Maintain confidentiality of team strategies and internal matters
- Follow all tournament rules and regulations

## 4. Equipment and Resources
- Take care of any provided equipment or resources
- Ensure stable internet connection and appropriate gaming setup
- Report technical issues that may affect performance
- Use approved software and game configurations

## 5. Termination and Changes
- Either party may terminate this agreement with appropriate notice
- Changes to this agreement require written consent
- Violation of terms may result in immediate termination
- All team property must be returned upon termination

By accepting this agreement, you acknowledge that you have read, understood, and agree to be bound by these terms.`
  }
}

// GET /api/agreements/content?role=player - Get agreement content for a role
export async function GET(request: NextRequest) {
  try {
    const { user } = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json({ error: 'Role parameter is required' }, { status: 400 })
    }

    // Try to get content from database first
    const { data: configData, error: configError } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', `agreement_content_${role}`)
      .single()

    let content
    if (configData && !configError) {
      try {
        content = JSON.parse(configData.value)
      } catch (e) {
        console.error('Failed to parse agreement content from database:', e)
        content = null
      }
    }

    // Fallback to default content if not found in database
    if (!content) {
      content = DEFAULT_AGREEMENT_CONTENT[role as keyof typeof DEFAULT_AGREEMENT_CONTENT]
      
      if (!content) {
        // Create basic default for any role
        content = {
          role,
          current_version: CURRENT_AGREEMENT_VERSIONS[role as keyof typeof CURRENT_AGREEMENT_VERSIONS] || 1,
          title: `${role.charAt(0).toUpperCase() + role.slice(1)} Agreement`,
          last_updated: 'January 2025',
          content: `# ${role.charAt(0).toUpperCase() + role.slice(1)} Agreement\n\nAgreement content is being configured. Please contact an administrator.`
        }
      }
    }

    return NextResponse.json({
      agreement: content
    })

  } catch (error) {
    console.error('Agreement content error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
