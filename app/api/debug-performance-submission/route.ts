import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG: Performance submission test endpoint called')
  
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Authenticate request
    const { user, supabase, error: authError } = await authenticateRequest(request)
    if (authError) {
      console.error('❌ DEBUG: Authentication failed:', authError)
      return createErrorResponse(authError)
    }

    if (!user || !supabase) {
      console.error('❌ DEBUG: No user or supabase client after authentication')
      return createErrorResponse({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401
      })
    }

    console.log('✅ DEBUG: Authentication successful for user:', user.id, 'role:', user.role)

    // Test database connection
    console.log('🔍 DEBUG: Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('performances')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ DEBUG: Database connection test failed:', testError)
      return createErrorResponse({
        error: 'Database connection test failed',
        code: 'DB_CONNECTION_ERROR',
        status: 500,
        details: testError.message
      })
    }

    console.log('✅ DEBUG: Database connection test successful')

    // Test a simple insert with minimal data
    console.log('🔍 DEBUG: Testing minimal insert...')
    const testPayload = {
      player_id: user.id,
      team_id: user.team_id,
      match_number: 999, // Use a high number to avoid conflicts
      map: 'Erangle',
      placement: 1,
      kills: 0,
      assists: 0,
      damage: 0,
      survival_time: 0,
      added_by: user.id
    }

    console.log('📦 DEBUG: Test payload:', testPayload)

    const { data: insertData, error: insertError } = await supabase
      .from('performances')
      .insert(testPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('❌ DEBUG: Test insert failed:', insertError)
      return createErrorResponse({
        error: 'Test insert failed',
        code: 'TEST_INSERT_ERROR',
        status: 500,
        details: insertError.message
      })
    }

    console.log('✅ DEBUG: Test insert successful, ID:', insertData.id)

    // Clean up test data
    console.log('🧹 DEBUG: Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('performances')
      .delete()
      .eq('id', insertData.id)

    if (deleteError) {
      console.error('⚠️ DEBUG: Failed to clean up test data:', deleteError)
    } else {
      console.log('✅ DEBUG: Test data cleaned up successfully')
    }

    return createSuccessResponse({
      message: 'Performance submission test successful',
      user_id: user.id,
      user_role: user.role,
      team_id: user.team_id,
      test_insert_id: insertData.id
    })

  } catch (error) {
    console.error('❌ DEBUG: Unexpected error in test endpoint:', error)
    return createErrorResponse({
      error: 'Internal server error in test endpoint',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}

// Simple CORS handler
function handleCors(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && !origin.includes('localhost') && !origin.includes('vercel.app')) {
    return NextResponse.json({ error: 'CORS not allowed' }, { status: 403 })
  }
  return null
}