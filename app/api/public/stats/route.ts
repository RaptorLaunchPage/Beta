import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse({
        error: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        status: 503
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const [teamsCountRes, playersCountRes, matchesCountRes, winsCountRes, expensesSumRes] = await Promise.all([
      // Count active teams (status = 'active')
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // Count active players (role = 'player' AND status = 'Active')
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'player').eq('status', 'Active'),
      // Count total performances (matches)
      supabase.from('performances').select('*', { count: 'exact', head: true }),
      // Count wins (placement = 1)
      supabase.from('performances').select('*', { count: 'exact', head: true }).eq('placement', 1),
      // Sum all slot expenses
      supabase.from('slot_expenses').select('total')
    ])

    // Check for errors in any of the queries
    const queries = [teamsCountRes, playersCountRes, matchesCountRes, winsCountRes, expensesSumRes]
    for (const query of queries) {
      if (query.error) {
        console.error('Database query error:', query.error)
        return createErrorResponse({
          error: 'Failed to fetch statistics',
          code: 'DATABASE_ERROR',
          status: 500,
          details: query.error.message
        })
      }
    }

    const activeTeams = (teamsCountRes.count || 0)
    const activePlayers = (playersCountRes.count || 0)
    const liveMatches = (matchesCountRes.count || 0)
    const liveWWCD = (winsCountRes.count || 0)
    const expenses = (expensesSumRes.data || []) as Array<{ total: number | null }>
    const expensesSum = expenses.reduce((sum, e) => sum + (e.total || 0), 0)

    // Base figures
    const baseUnderdogPractice = 37800
    const baseMatches = 3240
    const baseWWCD = 1134

    const costCovered = baseUnderdogPractice + expensesSum
    const totalMatches = baseMatches + liveMatches
    const totalWWCD = baseWWCD + liveWWCD

    return createSuccessResponse({
      stats: {
        activeTeams,
        activePlayers,
        totalMatches,
        totalWWCD,
        costCovered
      }
    })

  } catch (error: any) {
    console.error('Stats API error:', error)
    return createErrorResponse({
      error: error.message || 'Failed to load stats',
      code: 'INTERNAL_ERROR',
      status: 500
    })
  }
}