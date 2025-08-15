import { NextRequest, NextResponse } from 'next/server'
import getSupabaseAdmin from '@/lib/supabase-admin'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  handleCors
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check admin permissions
    if (user.role !== 'admin') {
      return createErrorResponse({
        error: 'Forbidden - Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: rows, error: settingsError } = await supabaseAdmin
      .from('admin_config')
      .select('key, value')

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return createErrorResponse({
        error: 'Failed to fetch settings',
        code: 'DATABASE_ERROR',
        status: 500,
        details: settingsError.message
      })
    }

    const settings: Record<string, string> = {}
    for (const r of rows || []) settings[r.key] = r.value

    return createSuccessResponse({ settings })

  } catch (error) {
    console.error('Admin settings GET error:', error)
    return createErrorResponse({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request)
    if (authError) {
      return createErrorResponse(authError)
    }

    if (!user) {
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    // Check admin permissions
    if (user.role !== 'admin') {
      return createErrorResponse({
        error: 'Forbidden - Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403
      })
    }

    const body = await request.json()
    const action = body.action as string | undefined

    if (action === 'purge_non_admin_data') {
      const supabaseAdmin = getSupabaseAdmin()
      const tables = [
        'attendances',
        'performances',
        'rosters',
        'slots',
        'sessions',
        'slot_expenses',
        'winnings'
      ]
      
      try {
        for (const table of tables) {
          await supabaseAdmin.from(table).delete().neq('id', null)
        }
        await supabaseAdmin.from('users').delete().neq('role', 'admin')
        return createSuccessResponse({ success: true }, 'Data purged successfully')
      } catch (purgeError) {
        console.error('Data purge error:', purgeError)
        return createErrorResponse({
          error: 'Failed to purge data',
          code: 'PURGE_ERROR',
          status: 500,
          details: purgeError instanceof Error ? purgeError.message : 'Unknown error'
        })
      }
    }

    // Save admin settings into admin_config
    const input = body.settings as Record<string, string | boolean> | undefined
    if (!input) {
      return createErrorResponse({
        error: 'settings payload required',
        code: 'MISSING_REQUIRED_FIELDS',
        status: 400
      })
    }

    const entries = Object.entries(input).map(([key, value]) => ({ key, value: String(value) }))

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('admin_config')
      .upsert(entries, { onConflict: 'key' })

    if (error) {
      console.error('Settings save error:', error)
      return createErrorResponse({
        error: 'Failed to save settings',
        code: 'DATABASE_ERROR',
        status: 500,
        details: error.message
      })
    }

    return createSuccessResponse({ success: true }, 'Settings saved successfully')

  } catch (error: any) {
    console.error('Admin settings POST error:', error)
    return createErrorResponse({
      error: error.message || 'Internal error',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}
