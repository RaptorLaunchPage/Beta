-- Update slots table to support slot-count-based billing
ALTER TABLE slots 
ADD COLUMN number_of_slots INTEGER NOT NULL DEFAULT 1,
ADD COLUMN slot_rate INTEGER NOT NULL DEFAULT 0,
ADD COLUMN notes TEXT;

-- Make match_count optional (it's already there, just update default)
ALTER TABLE slots ALTER COLUMN match_count DROP NOT NULL;
ALTER TABLE slots ALTER COLUMN match_count SET DEFAULT 0;

-- Update slot_expenses table to use slot-count-based billing
ALTER TABLE slot_expenses 
ADD COLUMN number_of_slots INTEGER NOT NULL DEFAULT 1;

-- Update existing slot_expenses to use number_of_slots = 1 for backward compatibility
UPDATE slot_expenses SET number_of_slots = 1 WHERE number_of_slots IS NULL;

-- Create a function to auto-generate expense entries
CREATE OR REPLACE FUNCTION create_slot_expense()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO slot_expenses (slot_id, team_id, rate, number_of_slots, total)
  VALUES (NEW.id, NEW.team_id, NEW.slot_rate, NEW.number_of_slots, NEW.slot_rate * NEW.number_of_slots);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate expense entries
DROP TRIGGER IF EXISTS trigger_create_slot_expense ON slots;
CREATE TRIGGER trigger_create_slot_expense
  AFTER INSERT ON slots
  FOR EACH ROW
  EXECUTE FUNCTION create_slot_expense();

-- Create tier defaults table for optional tier-based rate suggestions
CREATE TABLE IF NOT EXISTS tier_defaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE,
  default_slot_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tier rates
INSERT INTO tier_defaults (tier, default_slot_rate) VALUES
  ('God', 120),
  ('T1', 75),
  ('T2', 45),
  ('T3', 28),
  ('T4', 12)
ON CONFLICT (tier) DO UPDATE SET 
  default_slot_rate = EXCLUDED.default_slot_rate,
  updated_at = NOW();

-- Enable RLS for tier_defaults
ALTER TABLE tier_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tier_defaults table
CREATE POLICY "Admins and Managers can manage tier defaults" ON tier_defaults
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

-- All authenticated users can view tier defaults
CREATE POLICY "All authenticated users can view tier defaults" ON tier_defaults
  FOR SELECT USING (auth.role() = 'authenticated');
