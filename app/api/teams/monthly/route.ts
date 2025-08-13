import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeMonthlyOutcome, type MonthlyInput } from '@/lib/team-logic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getUser(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return { status: 503, error: 'Service unavailable' }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { status: 401, error: 'Authorization required' }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return { status: 401, error: 'Invalid token' }
  const { data: profile } = await supabase.from('users').select('id, role, team_id').eq('id', user.id).single()
  if (!profile) return { status: 404, error: 'User not found' }
  return { supabase, user: profile }
}

// GET: List monthly stats (filter by month or team)
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error, status }: any = await getUser(request)
    if (error) return NextResponse.json({ error }, { status })

    const url = new URL(request.url)
    const month = url.searchParams.get('month') || undefined
    const teamId = url.searchParams.get('teamId') || undefined

    let query = supabase.from('team_monthly_stats').select('*').order('month', { ascending: false })

    if (month) query = query.eq('month', month)
    if (teamId) query = query.eq('team_id', teamId)

    // RBAC: Admin/Manager see all; Coach sees only own; others forbidden
    if (user.role === 'coach') {
      query = query.eq('team_id', user.team_id)
    } else if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error: qErr } = await query
    if (qErr) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Upsert monthly input then compute outcome and persist
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error, status }: any = await getUser(request)
    if (error) return NextResponse.json({ error }, { status })

    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const input: MonthlyInput = body

    // Validate minimal fields
    if (!input?.teamId || !input?.month) {
      return NextResponse.json({ error: 'teamId and month are required' }, { status: 400 })
    }

    // Fetch tier defaults to estimate next month tier cost
    const tierRates: Record<string, number> = {}
    const { data: tierRows } = await supabase.from('tier_defaults').select('tier, default_slot_rate')
    tierRows?.forEach((r: any) => { tierRates[r.tier] = r.default_slot_rate })

    // Compute
    const outcome = computeMonthlyOutcome({ ...input, tierRates })

    // Persist upsert
    const payload = {
      team_id: input.teamId,
      month: input.month,
      current_tier: input.currentTier,
      slots_played: input.slotsPlayed,
      slots_won: input.slotsWon,
      slot_price_per_slot: input.slotPricePerSlot,
      slot_cost_per_slot: input.slotCostPerSlot || input.slotPricePerSlot,
      trial_phase: input.trialPhase,
      trial_weeks_used: input.trialWeeksUsed || 0,
      tournament_winnings: input.tournamentWinnings || 0,
      win_percentage: outcome.winPercentage,
      updated_tier: outcome.updatedTier,
      status_update: outcome.statusUpdate,
      sponsorship_status: outcome.sponsorshipStatus,
      trial_extension_granted: outcome.trial.extensionGranted,
      trial_extension_weeks: outcome.trial.extensionWeeks,
      monthly_prize_pool: outcome.incentives.monthlyPrizePool,
      monthly_cost: outcome.incentives.monthlyCost,
      surplus: outcome.incentives.surplus,
      org_share: outcome.incentives.orgShare,
      team_share: outcome.incentives.teamShare,
      next_month_tier_cost: outcome.incentives.nextMonthTierCost,
      split_rule: outcome.incentives.splitRule,
      recalculated_at: new Date().toISOString(),
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error: upErr } = await supabase
      .from('team_monthly_stats')
      .upsert(payload, { onConflict: 'team_id,month' })
      .select()

    if (upErr) {
      return NextResponse.json({ error: 'Failed to save monthly stats' }, { status: 500 })
    }

    // Optionally update team tier if status indicates promotion/demotion/exit
    if (['promoted', 'demoted', 'exited'].includes(outcome.statusUpdate)) {
      if (outcome.statusUpdate === 'exited') {
        await supabase.from('teams').update({ status: 'archived' }).eq('id', input.teamId)
      } else {
        await supabase.from('teams').update({ tier: outcome.updatedTier }).eq('id', input.teamId)
      }
    }

    return NextResponse.json({ data: data?.[0] || payload, outcome })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}