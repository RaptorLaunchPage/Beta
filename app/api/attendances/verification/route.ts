import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables during build')
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Service unavailable', status: 503 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Authorization header required', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  const { data: userData, error: userError } = await userSupabase
    .from('users')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { error: 'User not found', status: 404 }
  }

  return { userData, userSupabase }
}

// GET - Fetch pending attendance verifications
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only managers, coaches, and admins can access verification
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Try to get attendance records with training_details
    let query = userSupabase!
      .from('attendances')
      .select(`
        *,
        users!inner(name, email),
        sessions(title, session_subtype, date)
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (userData!.role === 'coach' && userData!.team_id) {
      query = query.eq('team_id', userData!.team_id)
    } else if (userData!.role === 'manager' && userData!.team_id) {
      query = query.eq('team_id', userData!.team_id)
    }
    // Admin can see all

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching attendance verifications:', queryError)
      // Return empty array instead of error for better UX
      return NextResponse.json([])
    }

    // Filter for records with training_details and pending verification status
    const pending = data?.filter(attendance => 
      attendance.training_details && 
      attendance.training_details.verification_status === 'pending'
    ) || []

    console.log(`Found ${pending.length} pending verification records out of ${data?.length || 0} total attendance records`)

    return NextResponse.json(pending)

  } catch (error) {
    console.error('Error in attendance verification GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update attendance verification status
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const { userData, userSupabase, error, status } = await getUserFromRequest(request)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Only managers, coaches, and admins can verify attendance
    if (!['admin', 'manager', 'coach'].includes(userData!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { attendance_id, action, manager_notes } = body

    if (!attendance_id || !['approved', 'denied'].includes(action)) {
      return NextResponse.json(
        { error: 'Attendance ID and valid action (approved/denied) are required' },
        { status: 400 }
      )
    }

    // Get current attendance record
    const { data: currentAttendance, error: fetchError } = await userSupabase!
      .from('attendances')
      .select('training_details, team_id')
      .eq('id', attendance_id)
      .single()

    if (fetchError || !currentAttendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to verify this attendance
    if (userData!.role === 'coach' && currentAttendance.team_id !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Coaches can only verify attendance for their own team' },
        { status: 403 }
      )
    } else if (userData!.role === 'manager' && currentAttendance.team_id !== userData!.team_id) {
      return NextResponse.json(
        { error: 'Managers can only verify attendance for their own team' },
        { status: 403 }
      )
    }

    // Update training details with verification
    const updatedTrainingDetails = {
      ...currentAttendance.training_details,
      verification_status: action,
      manager_notes: manager_notes || '',
      verified_by: userData!.id,
      verified_at: new Date().toISOString()
    }

    const { data, error: updateError } = await userSupabase!
      .from('attendances')
      .update({
        training_details: updatedTrainingDetails,
        verification_status: action,
        manager_notes: manager_notes || '',
        verified_by: userData!.id,
        verified_at: new Date().toISOString(),
        status: action === 'approved' ? 'present' : 'absent'
      })
      .eq('id', attendance_id)
      .select()

    if (updateError) {
      console.error('Error updating attendance verification:', updateError)
      return NextResponse.json(
        { error: 'Failed to update attendance verification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Attendance ${action} successfully`,
      attendance: data?.[0]
    })

  } catch (error) {
    console.error('Error in attendance verification PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}