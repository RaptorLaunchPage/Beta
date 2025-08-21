import { NextRequest, NextResponse } from 'next/server'
import getSupabaseAdmin from '@/lib/supabase-admin'

function buildContactEmbed(payload: any) {
  const description = payload.topic === 'Brand / Collaboration'
    ? 'New brand/collaboration inquiry received.'
    : 'New general inquiry received.'
  const fields: any[] = []
  if (payload.topic) fields.push({ name: 'Topic', value: payload.topic, inline: true })
  if (payload.name) fields.push({ name: 'Name', value: payload.name, inline: true })
  if (payload.subject) fields.push({ name: 'Subject', value: payload.subject, inline: true })
  if (payload.message) fields.push({ name: 'Message', value: payload.message.substring(0, 1024) })
  if (payload.brandName) fields.push({ name: 'Brand Name', value: payload.brandName, inline: true })
  if (payload.contactName) fields.push({ name: 'Contact', value: payload.contactName, inline: true })
  if (payload.website) fields.push({ name: 'Website', value: payload.website, inline: true })
  if (payload.collabType) fields.push({ name: 'Collab Type', value: payload.collabType, inline: true })
  
  // Add file attachment info if present
  if (payload.fileUrl) {
    fields.push({ 
      name: '📎 Attachment', 
      value: `[Download ${payload.fileName || 'File'}](${payload.fileUrl})`, 
      inline: false 
    })
  }

  return {
    username: 'Raptor Esports Submissions',
    embeds: [
      {
        title: '📬 Contact Submission',
        description,
        color: 0x3A7DFF,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'Raptor Esports' }
      }
    ]
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let webhookUrl = process.env.NEXT_PUBLIC_CONTACT_WEBHOOK_URL || process.env.NEXT_PUBLIC_PUBLIC_WEBHOOK_URL
    if (!webhookUrl) {
      try {
        const admin = getSupabaseAdmin()
        const { data: cfg } = await admin
          .from('admin_config')
          .select('value')
          .eq('key', 'default_public_webhook_id')
          .single()
        const defaultWebhookId = cfg?.value
        if (defaultWebhookId) {
          const { data: hook } = await admin
            .from('discord_webhooks')
            .select('hook_url')
            .eq('id', defaultWebhookId)
            .single()
          if (hook?.hook_url) webhookUrl = hook.hook_url
        }
      } catch {}
    }

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const payload = buildContactEmbed(body)
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      return NextResponse.json({ error: `Discord error: ${resp.status} ${text}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}