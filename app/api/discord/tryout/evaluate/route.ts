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

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tryout_id,
      invitation_id,
      application_id,
      evaluator_discord_id,
      guild_id,
      // Performance metrics
      kills = 0,
      assists = 0,
      damage = 0,
      survival_time = 0,
      placement,
      // Skill ratings (1-10)
      game_sense_score,
      utility_score,
      rotations_score,
      communication_score,
      // Evaluation details
      evaluation_notes,
      strengths,
      areas_for_improvement,
      recommendation, // 'strong_select', 'select', 'maybe', 'reject', 'strong_reject'
      is_final = false
    } = body

    // Validate required fields
    if (!tryout_id || !evaluator_discord_id || !guild_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: tryout_id, evaluator_discord_id, guild_id' 
      }, { status: 400 })
    }

    // Find evaluator user
    const { data: evaluatorUser, error: evaluatorError } = await supabase
      .from('discord_users')
      .select('user_id')
      .eq('discord_id', evaluator_discord_id)
      .eq('guild_id', guild_id)
      .single()

    if (evaluatorError && evaluatorError.code !== 'PGRST116') {
      console.error('Error finding evaluator:', evaluatorError)
      return NextResponse.json({ error: 'Evaluator not found' }, { status: 404 })
    }

    // Find invitation if not provided
    let targetInvitationId = invitation_id
    if (!targetInvitationId && application_id) {
      const { data: invitation } = await supabase
        .from('tryout_invitations')
        .select('id')
        .eq('tryout_id', tryout_id)
        .eq('application_id', application_id)
        .single()
      
      targetInvitationId = invitation?.id
    }

    if (!targetInvitationId) {
      return NextResponse.json({ 
        error: 'Could not find invitation for evaluation' 
      }, { status: 404 })
    }

    // Calculate overall score if individual scores provided
    let overallScore = null
    if (game_sense_score && utility_score && rotations_score && communication_score) {
      overallScore = (game_sense_score + utility_score + rotations_score + communication_score) / 4
    }

    // Check if evaluation already exists
    const { data: existingEvaluation, error: existingError } = await supabase
      .from('tryout_evaluations')
      .select('id')
      .eq('tryout_id', tryout_id)
      .eq('invitation_id', targetInvitationId)
      .eq('evaluator_id', evaluatorUser?.user_id)
      .single()

    let evaluation
    if (existingEvaluation) {
      // Update existing evaluation
      const { data, error } = await supabase
        .from('tryout_evaluations')
        .update({
          kills,
          assists,
          damage,
          survival_time,
          placement,
          game_sense_score,
          utility_score,
          rotations_score,
          communication_score,
          overall_score: overallScore,
          evaluation_notes,
          strengths,
          areas_for_improvement,
          recommendation,
          is_final,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEvaluation.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating evaluation:', error)
        return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 })
      }
      evaluation = data
    } else {
      // Create new evaluation
      const { data, error } = await supabase
        .from('tryout_evaluations')
        .insert({
          tryout_id,
          invitation_id: targetInvitationId,
          evaluator_id: evaluatorUser?.user_id,
          kills,
          assists,
          damage,
          survival_time,
          placement,
          game_sense_score,
          utility_score,
          rotations_score,
          communication_score,
          overall_score: overallScore,
          evaluation_notes,
          strengths,
          areas_for_improvement,
          recommendation,
          is_final,
          evaluation_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating evaluation:', error)
        return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 })
      }
      evaluation = data
    }

    // Update application phase if this is a final evaluation
    if (is_final && application_id) {
      await supabase
        .from('tryout_applications')
        .update({ phase: 'evaluated' })
        .eq('id', application_id)
    }

    // Generate recommendation color
    const getRecommendationColor = (rec: string) => {
      switch (rec) {
        case 'strong_select': return 0x00ff00
        case 'select': return 0x66ff66
        case 'maybe': return 0xffff00
        case 'reject': return 0xff6666
        case 'strong_reject': return 0xff0000
        default: return 0x666666
      }
    }

    // Generate embed for Discord notification
    const embedData = {
      title: '📊 Tryout Evaluation Submitted',
      description: `Evaluation ${existingEvaluation ? 'updated' : 'created'} successfully.`,
      fields: [
        {
          name: '🎯 Overall Score',
          value: overallScore ? `${overallScore.toFixed(1)}/10` : 'Not calculated',
          inline: true
        },
        {
          name: '🏆 Recommendation',
          value: recommendation ? recommendation.replace('_', ' ').toUpperCase() : 'None',
          inline: true
        },
        {
          name: '📅 Evaluation Date',
          value: new Date().toLocaleDateString(),
          inline: true
        },
        ...(kills || assists || damage ? [{
          name: '📈 Performance Stats',
          value: `K: ${kills}, A: ${assists}, D: ${damage}${placement ? `, #${placement}` : ''}`,
          inline: false
        }] : []),
        ...(game_sense_score ? [{
          name: '🧠 Skill Ratings',
          value: `Game Sense: ${game_sense_score}/10, Utility: ${utility_score}/10\nRotations: ${rotations_score}/10, Communication: ${communication_score}/10`,
          inline: false
        }] : []),
        ...(strengths ? [{
          name: '💪 Strengths',
          value: strengths.substring(0, 200),
          inline: false
        }] : []),
        ...(areas_for_improvement ? [{
          name: '📈 Areas for Improvement',
          value: areas_for_improvement.substring(0, 200),
          inline: false
        }] : []),
        {
          name: '📋 Status',
          value: is_final ? 'Final Evaluation' : 'Preliminary Evaluation',
          inline: true
        }
      ],
      color: recommendation ? getRecommendationColor(recommendation) : 0x0099ff,
      footer: {
        text: 'Raptors Esports Tryouts - Evaluation System'
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.id,
        tryout_id: evaluation.tryout_id,
        invitation_id: evaluation.invitation_id,
        overall_score: evaluation.overall_score,
        recommendation: evaluation.recommendation,
        is_final: evaluation.is_final,
        created_at: evaluation.created_at,
        updated_at: evaluation.updated_at
      },
      embed_data: embedData,
      message: `Evaluation ${existingEvaluation ? 'updated' : 'created'} successfully`,
      action: existingEvaluation ? 'updated' : 'created'
    })

  } catch (error: any) {
    console.error('Tryout evaluation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}