-- Modify teams table to add tier, coach_id, and status
ALTER TABLE teams
ADD COLUMN tier TEXT DEFAULT 'T4',
ADD COLUMN coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN status TEXT DEFAULT 'active';

-- Remove in_game_role, contact_number, device_info from users table
-- These will be moved to the rosters table for team-specific roles
ALTER TABLE users
DROP COLUMN IF EXISTS in_game_role,
DROP COLUMN IF EXISTS contact_number,
DROP COLUMN IF EXISTS device_info;

-- Create rosters table for team-specific player details
CREATE TABLE IF NOT EXISTS rosters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  in_game_role TEXT, -- IGL, Support, Scout, Entry Frag
  contact_number TEXT,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id) -- A user can only be on a specific team's roster once
);

-- Create slots table for booking practice/match slots
CREATE TABLE IF NOT EXISTS slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  organizer TEXT NOT NULL,
  time_range TEXT NOT NULL, -- e.g., "3-5 PM"
  match_count INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slot_expenses table (auto-linked to slots)
CREATE TABLE IF NOT EXISTS slot_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  rate INTEGER NOT NULL,
  total INTEGER NOT NULL, -- auto: rate * match_count
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prize_pools table
CREATE TABLE IF NOT EXISTS prize_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE NOT NULL,
  total_amount INTEGER NOT NULL,
  breakdown JSONB, -- { "1st": 1000, "2nd": 500, ... }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create winnings table
CREATE TABLE IF NOT EXISTS winnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL, -- 1, 2, 3, 4
  amount_won INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE winnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table (updated)
-- Admins/Managers: Full access
CREATE POLICY "Admins and Managers can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: View only teams they coach
CREATE POLICY "Coach can view their assigned teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'coach' AND id = teams.coach_id
    )
  );

-- Players: View only their team
CREATE POLICY "Players can view their team" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND team_id = teams.id
    )
  );

-- RLS Policies for rosters table
-- Admin/Manager: Full access
CREATE POLICY "Admins and Managers can manage rosters" ON rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: Manage their team's roster
CREATE POLICY "Coach can manage their team's roster" ON rosters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = rosters.team_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = rosters.team_id
    )
  );

-- Players: View own roster entry
CREATE POLICY "Players can view their own roster entry" ON rosters
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for slots table
-- Admin/Manager: Full access
CREATE POLICY "Admins and Managers can manage slots" ON slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: Manage their team's slots
CREATE POLICY "Coach can manage their team's slots" ON slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = slots.team_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = slots.team_id
    )
  );

-- Players: View their team's slots
CREATE POLICY "Players can view their team's slots" ON slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.team_id = slots.team_id
    )
  );

-- RLS Policies for slot_expenses table
-- Admin/Manager: Full access
CREATE POLICY "Admins and Managers can manage slot expenses" ON slot_expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: View their team's expenses
CREATE POLICY "Coach can view their team's slot expenses" ON slot_expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = slot_expenses.team_id
    )
  );

-- Players: View their team's expenses
CREATE POLICY "Players can view their team's slot expenses" ON slot_expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.team_id = slot_expenses.team_id
    )
  );

-- RLS Policies for prize_pools table
-- Admin/Manager: Full access
CREATE POLICY "Admins and Managers can manage prize pools" ON prize_pools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: Manage their team's prize pools (via slot_id)
CREATE POLICY "Coach can manage their team's prize pools" ON prize_pools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN slots s ON u.team_id = s.team_id
      WHERE u.id = auth.uid() AND u.role = 'coach' AND s.id = prize_pools.slot_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN slots s ON u.team_id = s.team_id
      WHERE u.id = auth.uid() AND u.role = 'coach' AND s.id = prize_pools.slot_id
    )
  );

-- Players: View their team's prize pools
CREATE POLICY "Players can view their team's prize pools" ON prize_pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN slots s ON u.team_id = s.team_id
      WHERE u.id = auth.uid() AND s.id = prize_pools.slot_id
    )
  );

-- RLS Policies for winnings table
-- Admin/Manager: Full access
CREATE POLICY "Admins and Managers can manage winnings" ON winnings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Coach: Manage their team's winnings
CREATE POLICY "Coach can manage their team's winnings" ON winnings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = winnings.team_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'coach' AND u.team_id = winnings.team_id
    )
  );

-- Players: View their team's winnings
CREATE POLICY "Players can view their team's winnings" ON winnings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.team_id = winnings.team_id
    )
  );
