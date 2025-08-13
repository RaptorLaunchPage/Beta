import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Validate API key middleware
function validateBotApiKey(request: NextRequest) {
  const apiKey = request.headers.get('authorization')
  const expectedKey = `Bearer ${process.env.RAPTOR_BOT_API_KEY}`
  
  if (!apiKey || apiKey !== expectedKey) {
    return false
  }
  return true
}

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const discord_id = searchParams.get('discord_id')
    const guild_id = searchParams.get('guild_id')
    const tryout_id = searchParams.get('tryout_id')

    if (!discord_id || !guild_id) {
      return NextResponse.json({ 
        error: 'Missing required parameters: discord_id, guild_id' 
      }, { status: 400 })
    }

    // Build query for applications
    let query = supabase
      .from('tryout_applications')
      .select(`
        *,
        tryouts(id, name, mode, type, status, application_deadline)
      `)
      .eq('discord_id', discord_id)

    // Filter by specific tryout if provided
    if (tryout_id) {
      query = query.eq('tryout_id', tryout_id)
    } else {
      // Get applications for tryouts in this guild
      const { data: guildTryouts } = await supabase
        .from('tryouts')
        .select('id')
        .eq('guild_id', guild_id)

      if (guildTryouts && guildTryouts.length > 0) {
        const tryoutIds = guildTryouts.map(t => t.id)
        query = query.in('tryout_id', tryoutIds)
      } else {
        // No tryouts in this guild
        return NextResponse.json({
          success: true,
          discord_id,
          guild_id,
          applications: [],
          message: 'No tryouts found for this server'
        })
      }
    }

    const { data: applications, error: applicationsError } = await query
      .order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch tryout status' }, { status: 500 })
    }

    // Get invitations and evaluations for these applications
    const applicationIds = applications.map(app => app.id)
    const tryoutIds = applications.map(app => app.tryout_id)

    const [invitationsResult, evaluationsResult] = await Promise.allSettled([
      // Get invitations
      applicationIds.length > 0 ? supabase
        .from('tryout_invitations')
        .select('*')
        .in('application_id', applicationIds) : Promise.resolve({ data: [] }),

      // Get evaluations
      tryoutIds.length > 0 ? supabase
        .from('tryout_evaluations')
        .select('*')
        .in('tryout_id', tryoutIds) : Promise.resolve({ data: [] })
    ])

    const invitations = invitationsResult.status === 'fulfilled' ? invitationsResult.value.data || [] : []
    const evaluations = evaluationsResult.status === 'fulfilled' ? evaluationsResult.value.data || [] : []

    // Process applications with their status
    const processedApplications = applications.map((app: any) => {
      const invitation = invitations.find((inv: any) => inv.application_id === app.id)
      const evaluation = evaluations.find((evaluation: any) => evaluation.tryout_id === app.tryout_id)

      // Determine current phase
      let currentPhase: string = app.phase || app.status
      let nextStep = 'Waiting for review'
      let canProgress = false

      switch (currentPhase) {
        case 'applied':
          nextStep = 'Application under review'
          break
        case 'screened':
          nextStep = 'Waiting for invitation'
          break
        case 'invited':
          nextStep = 'Evaluation in progress'
          canProgress = true
          break
        case 'evaluated':
          nextStep = 'Final decision pending'
          break
        case 'selected':
          nextStep = 'Congratulations! You have been selected'
          break
        case 'rejected':
          nextStep = 'Application was not successful'
          break
      }

      // Generate status emoji
      const getStatusEmoji = (phase: string) => {
        switch (phase) {
          case 'applied': return '📝'
          case 'screened': return '🔍'
          case 'invited': return '🎉'
          case 'evaluated': return '📊'
          case 'selected': return '✅'
          case 'rejected': return '❌'
          default: return '⏳'
        }
      }

      return {
        ...app,
        tryout_info: app.tryouts,
        invitation: invitation || null,
        evaluation: evaluation || null,
        current_phase: currentPhase,
        next_step: nextStep,
        can_progress: canProgress,
        status_emoji: getStatusEmoji(currentPhase),
        progress_percentage: (() => {
          const progressMap = {
            'applied': 20,
            'screened': 40,
            'invited': 60,
            'evaluated': 80,
            'selected': 100,
            'rejected': 0
          } as const
          return progressMap[currentPhase as keyof typeof progressMap] || 0
        })()
      }
    })

    // Generate summary embed if applications exist
    let embedData = null
    if (processedApplications.length > 0) {
      const latestApplication = processedApplications[0]
      
      embedData = {
        title: '📋 Your Tryout Status',
        description: `Status for ${processedApplications.length} tryout application(s)`,
        fields: processedApplications.map(app => ({
          name: `${app.status_emoji} ${app.tryout_info?.name || 'Unknown Tryout'}`,
          value: `**Phase:** ${app.current_phase.toUpperCase()}\n**Progress:** ${app.progress_percentage}%\n**Next:** ${app.next_step}`,
          inline: false
        })).slice(0, 5), // Limit to 5 for embed size
        color: processedApplications.some(app => app.current_phase === 'selected') ? 0x00ff00 :
               processedApplications.some(app => app.current_phase === 'rejected') ? 0xff0000 :
               0x0099ff,
        footer: {
          text: 'Raptors Esports Tryouts - Status Check'
        },
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      discord_id,
      guild_id,
      tryout_id,
      total_applications: processedApplications.length,
      applications: processedApplications,
      summary: {
        active_applications: processedApplications.filter(app => 
          !['selected', 'rejected'].includes(app.current_phase)).length,
        selected_applications: processedApplications.filter(app => 
          app.current_phase === 'selected').length,
        rejected_applications: processedApplications.filter(app => 
          app.current_phase === 'rejected').length
      },
      embed_data: embedData,
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Tryout status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}