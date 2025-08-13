-- Team Monthly Stats for tiering and incentives
CREATE TABLE IF NOT EXISTS team_monthly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  current_tier TEXT NOT NULL DEFAULT 'T4',
  slots_played INTEGER NOT NULL DEFAULT 0,
  slots_won INTEGER NOT NULL DEFAULT 0,
  slot_price_per_slot INTEGER NOT NULL DEFAULT 0,
  slot_cost_per_slot INTEGER NOT NULL DEFAULT 0,
  trial_phase TEXT NOT NULL DEFAULT 'none', -- none|trial|extended
  trial_weeks_used INTEGER NOT NULL DEFAULT 0,
  tournament_winnings INTEGER NOT NULL DEFAULT 0,
  -- Computed outputs
  win_percentage NUMERIC NOT NULL DEFAULT 0,
  updated_tier TEXT NOT NULL DEFAULT 'T4',
  status_update TEXT NOT NULL DEFAULT 'retained', -- promoted|retained|demoted|exited
  sponsorship_status TEXT NOT NULL DEFAULT 'none', -- trial|sponsored|exited|none
  trial_extension_granted BOOLEAN NOT NULL DEFAULT false,
  trial_extension_weeks INTEGER NOT NULL DEFAULT 0,
  monthly_prize_pool INTEGER NOT NULL DEFAULT 0,
  monthly_cost INTEGER NOT NULL DEFAULT 0,
  surplus INTEGER NOT NULL DEFAULT 0,
  org_share INTEGER NOT NULL DEFAULT 0,
  team_share INTEGER NOT NULL DEFAULT 0,
  next_month_tier_cost INTEGER NOT NULL DEFAULT 0,
  split_rule TEXT NOT NULL DEFAULT 'surplus_30_70',
  recalculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, month)
);

ALTER TABLE team_monthly_stats ENABLE ROW LEVEL SECURITY;

-- RBAC: Only admin/manager can manage; coach can view own team; players no access
CREATE POLICY "MonthlyStats admins managers all" ON team_monthly_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','manager')
    )
  );

CREATE POLICY "MonthlyStats coach select own team" ON team_monthly_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = team_monthly_stats.team_id
    )
  );

-- Optional view for finance and analytics can be added later