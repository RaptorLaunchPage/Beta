-- Add missing tier_defaults table to match application usage
-- This table is used in app/dashboard/team-management/slots/page.tsx

CREATE TABLE IF NOT EXISTS tier_defaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL,
  default_slot_rate INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tier values
INSERT INTO tier_defaults (tier, default_slot_rate) VALUES
  ('T1', 500),
  ('T2', 400),
  ('T3', 300),
  ('T4', 200)
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS
ALTER TABLE tier_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tier_defaults table
CREATE POLICY "Admins and Managers can manage tier defaults" ON tier_defaults
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "All authenticated users can view tier defaults" ON tier_defaults
  FOR SELECT USING (auth.role() = 'authenticated');