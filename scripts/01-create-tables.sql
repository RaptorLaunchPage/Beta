-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'Bronze',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'coach', 'player', 'analyst')) DEFAULT 'player',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  contact_number TEXT,
  in_game_role TEXT,
  device_info TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Benched', 'On Leave', 'Discontinued')),
  gyroscope_enabled BOOLEAN DEFAULT true,
  instagram_handle TEXT,
  discord_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performances table
CREATE TABLE IF NOT EXISTS performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  map TEXT NOT NULL,
  placement INTEGER,
  kills INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  damage FLOAT DEFAULT 0,
  survival_time FLOAT DEFAULT 0,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, match_number, slot)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for teams table
CREATE POLICY "All authenticated users can view teams" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for performances table
CREATE POLICY "Players can view own performances" ON performances
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Team staff can view team performances" ON performances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role = 'admin' OR u.team_id = performances.team_id)
    )
  );

CREATE POLICY "Analysts can view all performances" ON performances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'analyst'
    )
  );

CREATE POLICY "Staff can insert performances" ON performances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = team_id)
    )
  );

CREATE POLICY "Staff can update performances" ON performances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = performances.team_id)
    )
  );

CREATE POLICY "Staff can delete performances" ON performances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = performances.team_id)
    )
  );
