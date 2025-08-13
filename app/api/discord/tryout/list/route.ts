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
    const guild_id = searchParams.get('guild_id')
    const status = searchParams.get('status') || 'active'
    const mode = searchParams.get('mode') // 'player' or 'team'
    const include_stats = searchParams.get('include_stats') === 'true'

    if (!guild_id) {
      return NextResponse.json({ 
        error: 'Missing required parameter: guild_id' 
      }, { status: 400 })
    }

    // Build query for tryouts
    const baseSelect = '*'
    const statsSelect = `
      *,
      tryout_applications(id, status, phase, created_at),
      tryout_invitations(id, status, invited_at),
      tryout_evaluations(id, recommendation, overall_score, is_final)
    `
    
    let query = supabase
      .from('tryouts')
      .select(include_stats ? statsSelect : baseSelect)
      .eq('guild_id', guild_id)

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by mode
    if (mode) {
      query = query.eq('mode', mode)
    }

    const { data: tryouts, error: tryoutsError } = await query
      .order('created_at', { ascending: false })

    if (tryoutsError) {
      console.error('Error fetching tryouts:', tryoutsError)
      return NextResponse.json({ error: 'Failed to fetch tryouts' }, { status: 500 })
    }

    // Process tryouts with statistics
    const processedTryouts = tryouts.map((tryout: any) => {
      let stats = null
      
      if (include_stats && tryout.tryout_applications) {
        const applications = tryout.tryout_applications || []
        const invitations = tryout.tryout_invitations || []
        const evaluations = tryout.tryout_evaluations || []

        stats = {
          total_applications: applications.length,
          applications_by_status: {
            applied: applications.filter((app: any) => app.status === 'applied').length,
            screened: applications.filter((app: any) => app.status === 'screened').length,
            shortlisted: applications.filter((app: any) => app.status === 'shortlisted').length,
            rejected: applications.filter((app: any) => app.status === 'rejected').length
          },
                      applications_by_phase: {
              applied: applications.filter((app: any) => app.phase === 'applied').length,
              screened: applications.filter((app: any) => app.phase === 'screened').length,
              invited: applications.filter((app: any) => app.phase === 'invited').length,
              evaluated: applications.filter((app: any) => app.phase === 'evaluated').length,
                            selected: applications.filter((app: any) => app.phase === 'selected').length,
              rejected: applications.filter((app: any) => app.phase === 'rejected').length
          },
          total_invitations: invitations.length,
                      invitation_statuses: {
              invited: invitations.filter((inv: any) => inv.status === 'invited').length,
              accepted: invitations.filter((inv: any) => inv.status === 'accepted').length,
              declined: invitations.filter((inv: any) => inv.status === 'declined').length,
              expired: invitations.filter((inv: any) => inv.status === 'expired').length
          },
          total_evaluations: evaluations.length,
          evaluation_recommendations: {
            strong_select: evaluations.filter((evaluation: any) => evaluation.recommendation === 'strong_select').length,
            select: evaluations.filter((evaluation: any) => evaluation.recommendation === 'select').length,
            maybe: evaluations.filter((evaluation: any) => evaluation.recommendation === 'maybe').length,
            reject: evaluations.filter((evaluation: any) => evaluation.recommendation === 'reject').length,
            strong_reject: evaluations.filter((evaluation: any) => evaluation.recommendation === 'strong_reject').length
          },
          average_score: evaluations.length > 0 
            ? (evaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.overall_score || 0), 0) / evaluations.length).toFixed(1)
            : null,
          conversion_rate: applications.length > 0 
            ? ((applications.filter((app: any) => app.phase === 'selected').length / applications.length) * 100).toFixed(1)
            : '0.0'
        }
      }

      // Calculate time remaining if deadline exists
      let timeRemaining = null
      if (tryout.application_deadline) {
        const deadline = new Date(tryout.application_deadline)
        const now = new Date()
        const diffMs = deadline.getTime() - now.getTime()
        
        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          timeRemaining = days > 0 ? `${days} days, ${hours} hours` : `${hours} hours`
        } else {
          timeRemaining = 'Expired'
        }
      }

      // Generate status emoji
      const getStatusEmoji = (status: string) => {
        switch (status) {
          case 'draft': return '📝'
          case 'active': return '🟢'
          case 'closed': return '🔒'
          case 'completed': return '✅'
          case 'archived': return '📦'
          default: return '⏳'
        }
      }

      return {
        id: tryout.id,
        name: tryout.name,
        purpose: tryout.purpose,
        mode: tryout.mode,
        type: tryout.type,
        status: tryout.status,
        status_emoji: getStatusEmoji(tryout.status),
        target_roles: tryout.target_roles,
        team_ids: tryout.team_ids,
        description: tryout.description,
        requirements: tryout.requirements,
        application_deadline: tryout.application_deadline,
        time_remaining: timeRemaining,
        evaluation_method: tryout.evaluation_method,
        additional_links: tryout.additional_links,
        open_to_public: tryout.open_to_public,
        discord_channel_id: tryout.discord_channel_id,
        created_at: tryout.created_at,
        launched_at: tryout.launched_at,
        closed_at: tryout.closed_at,
        statistics: stats
      }
    })

    // Generate summary embed
    const embedData = {
      title: '📋 Active Tryouts',
      description: `Found ${processedTryouts.length} tryout(s) for this server`,
      fields: processedTryouts.slice(0, 10).map(tryout => {
        const fields = [
          `**Type:** ${tryout.type}`,
          `**Mode:** ${tryout.mode}`,
          `**Status:** ${tryout.status_emoji} ${tryout.status.toUpperCase()}`
        ]
        
        if (tryout.time_remaining) {
          fields.push(`**Time Left:** ${tryout.time_remaining}`)
        }
        
        if (tryout.statistics) {
          fields.push(`**Applications:** ${tryout.statistics.total_applications}`)
        }

        return {
          name: `🎯 ${tryout.name}`,
          value: fields.join('\n'),
          inline: true
        }
      }),
      color: processedTryouts.some(t => t.status === 'active') ? 0x00ff00 : 0x666666,
      footer: {
        text: 'Raptors Esports Tryouts'
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      guild_id,
      filters: {
        status,
        mode,
        include_stats
      },
      total_tryouts: processedTryouts.length,
      tryouts: processedTryouts,
      summary: {
        by_status: {
          draft: processedTryouts.filter(t => t.status === 'draft').length,
          active: processedTryouts.filter(t => t.status === 'active').length,
          closed: processedTryouts.filter(t => t.status === 'closed').length,
          completed: processedTryouts.filter(t => t.status === 'completed').length,
          archived: processedTryouts.filter(t => t.status === 'archived').length
        },
        by_mode: {
          player: processedTryouts.filter(t => t.mode === 'player').length,
          team: processedTryouts.filter(t => t.mode === 'team').length
        },
        by_type: {
          scrim: processedTryouts.filter(t => t.type === 'scrim').length,
          tournament: processedTryouts.filter(t => t.type === 'tournament').length,
          practice: processedTryouts.filter(t => t.type === 'practice').length,
          meeting: processedTryouts.filter(t => t.type === 'meeting').length
        }
      },
      embed_data: embedData,
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Tryout list error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}