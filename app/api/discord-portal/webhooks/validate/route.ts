import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookUrl } from '@/modules/discord-portal'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const result = await validateWebhookUrl(url)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error validating webhook URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}