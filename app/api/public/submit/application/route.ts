import { NextRequest, NextResponse } from 'next/server'

function buildApplicationEmbed(payload: any) {
  const fields: any[] = []
  if (payload.name) fields.push({ name: 'Name', value: payload.name, inline: true })
  if (payload.ign) fields.push({ name: 'IGN', value: payload.ign, inline: true })
  if (payload.email) fields.push({ name: 'Email', value: payload.email, inline: true })
  if (payload.phone) fields.push({ name: 'Phone', value: payload.phone, inline: true })
  if (payload.applicantType) fields.push({ name: 'Applicant', value: payload.applicantType, inline: true })
  if (Array.isArray(payload.games) && payload.games.length) fields.push({ name: 'Games', value: payload.games.join(', '), inline: false })
  if (payload.otherGame) fields.push({ name: 'Other Game', value: payload.otherGame, inline: true })
  if (payload.tier) fields.push({ name: 'Current Tier', value: payload.tier, inline: true })
  if (payload.results) fields.push({ name: 'Results', value: payload.results.substring(0, 1024) })

  return {
    username: 'Raptor Esports Submissions',
    embeds: [
      {
        title: '📝 Application Submission',
        description: 'A new player/team application has been submitted.',
        color: 0x22C55E,
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
    const webhookUrl = process.env.NEXT_PUBLIC_APPLICATION_WEBHOOK_URL || process.env.NEXT_PUBLIC_PUBLIC_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const payload = buildApplicationEmbed(body)
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