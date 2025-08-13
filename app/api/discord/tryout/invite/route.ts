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
      application_id,
      tryout_id,
      discord_id,
      guild_id,
      invited_by_discord_id,
      invitation_message,
      temporary_access_granted = false,
      access_expires_at
    } = body

    // Validate required fields
    if (!application_id && (!tryout_id || !discord_id)) {
      return NextResponse.json({ 
        error: 'Missing required fields: application_id OR (tryout_id AND discord_id)' 
      }, { status: 400 })
    }

    // Find the application
    let application
    if (application_id) {
      const { data, error } = await supabase
        .from('tryout_applications')
        .select('*')
        .eq('id', application_id)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      application = data
    } else {
      // Find by tryout_id and discord_id
      const { data, error } = await supabase
        .from('tryout_applications')
        .select('*')
        .eq('tryout_id', tryout_id)
        .eq('discord_id', discord_id)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      application = data
    }

    // Find Discord user who is sending the invite
    let invitedBy = null
    if (invited_by_discord_id && guild_id) {
      const { data: discordUser } = await supabase
        .from('discord_users')
        .select('user_id')
        .eq('discord_id', invited_by_discord_id)
        .eq('guild_id', guild_id)
        .single()
      
      invitedBy = discordUser?.user_id
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('tryout_invitations')
      .select('id, status')
      .eq('tryout_id', application.tryout_id)
      .eq('application_id', application.id)
      .single()

    if (existingInvitation) {
      return NextResponse.json({ 
        success: true,
        invitation_id: existingInvitation.id,
        current_status: existingInvitation.status,
        message: 'Invitation already exists',
        action: 'existing'
      })
    }

    // Parse access expiration if provided
    let expiresAt = null
    if (access_expires_at) {
      expiresAt = new Date(access_expires_at).toISOString()
    } else if (temporary_access_granted) {
      // Default to 7 days from now
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 7)
      expiresAt = expiry.toISOString()
    }

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('tryout_invitations')
      .insert({
        tryout_id: application.tryout_id,
        application_id: application.id,
        invited_by: invitedBy,
        status: 'invited',
        invitation_message,
        temporary_access_granted,
        access_expires_at: expiresAt,
        invited_at: new Date().toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Update application phase to 'invited'
    await supabase
      .from('tryout_applications')
      .update({ 
        phase: 'invited',
        status: 'screened' // They've been screened and are now invited
      })
      .eq('id', application.id)

    // Get tryout details for response
    const { data: tryout } = await supabase
      .from('tryouts')
      .select('name, mode, type')
      .eq('id', application.tryout_id)
      .single()

    // Generate embed for Discord notification
    const embedData = {
      title: '🎉 Tryout Invitation Sent!',
      description: `Candidate has been invited to the next phase of ${tryout?.name || 'the tryout'}.`,
      fields: [
        {
          name: '👤 Candidate',
          value: application.team_name || `${application.full_name} (${application.ign})`,
          inline: true
        },
        {
          name: '🎯 Tryout',
          value: tryout?.name || 'Unknown',
          inline: true
        },
        {
          name: '📅 Invited',
          value: new Date().toLocaleDateString(),
          inline: true
        },
        {
          name: '🔑 Temporary Access',
          value: temporary_access_granted ? 'Yes' : 'No',
          inline: true
        },
        ...(expiresAt ? [{
          name: '⏰ Access Expires',
          value: new Date(expiresAt).toLocaleDateString(),
          inline: true
        }] : []),
        {
          name: '📋 Phase',
          value: 'Invited for Evaluation',
          inline: false
        },
        ...(invitation_message ? [{
          name: '💬 Message',
          value: invitation_message,
          inline: false
        }] : [])
      ],
      color: 0x0099ff,
      footer: {
        text: 'Raptors Esports Tryouts'
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        tryout_id: invitation.tryout_id,
        application_id: invitation.application_id,
        status: invitation.status,
        temporary_access_granted: invitation.temporary_access_granted,
        access_expires_at: invitation.access_expires_at,
        invited_at: invitation.invited_at
      },
      application_update: {
        phase: 'invited',
        status: 'screened'
      },
      embed_data: embedData,
      message: 'Invitation sent successfully',
      action: 'created'
    })

  } catch (error: any) {
    console.error('Tryout invitation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}