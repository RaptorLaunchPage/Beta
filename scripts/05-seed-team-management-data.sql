-- Seed data for new tables and updated teams/users

-- Update existing teams with tier and status
UPDATE teams SET tier = 'T1', status = 'active' WHERE id = '550e8400-e29b-41d4-a716-446655440001'; -- Raptor Alpha
UPDATE teams SET tier = 'T3', status = 'active' WHERE id = '550e8400-e29b-41d4-a716-446655440002'; -- Raptor Beta

-- Insert a coach user (assuming admin@raptoresports.gg is already admin)
-- For testing, let's create a specific coach user if not already present
INSERT INTO users (id, email, name, role, team_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'coach@raptoresports.gg', 'Coach Smith', 'coach', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, team_id = EXCLUDED.team_id;

-- Assign coach to Raptor Alpha
UPDATE teams SET coach_id = '550e8400-e29b-41d4-a716-446655440001' WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Insert player users and assign to teams
INSERT INTO users (id, email, name, role, team_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440004', 'player1@raptoresports.gg', 'Player One', 'player', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440005', 'player2@raptoresports.gg', 'Player Two', 'player', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440006', 'player3@raptoresports.gg', 'Player Three', 'player', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, team_id = EXCLUDED.team_id;

-- Insert roster entries for players
INSERT INTO rosters (team_id, user_id, in_game_role, contact_number, device_info) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'IGL', '111-222-3333', 'PC, Mouse: G Pro X Superlight'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', 'Entry Frag', '444-555-6666', 'PC, Keyboard: Ducky One 2 Mini'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440006', 'Support', '777-888-9999', 'PC, Headset: HyperX Cloud II')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Insert sample slots
INSERT INTO slots (id, team_id, organizer, time_range, match_count, date) VALUES
  ('a0000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'ESL', '10 AM - 12 PM', 2, CURRENT_DATE),
  ('a0000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'FaceIt', '3 PM - 5 PM', 3, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Insert sample slot expenses (auto-linked, but manually insert for seeding)
-- Raptor Alpha (T1) - 2 matches: 70-80 per slot. Let's say 75. Total = 75 * 2 = 150
INSERT INTO slot_expenses (slot_id, team_id, rate, total) VALUES
  ('a0000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440001', 75, 150)
ON CONFLICT (id) DO NOTHING;

-- Raptor Beta (T3) - 3 matches: 25-30 per slot. Let's say 28. Total = 28 * 3 = 84
INSERT INTO slot_expenses (slot_id, team_id, rate, total) VALUES
  ('a0000000-0000-0000-0000-000000000002', '550e8400-0000-0000-0000-000000000002', 28, 84)
ON CONFLICT (id) DO NOTHING;

-- Insert sample prize pool
INSERT INTO prize_pools (id, slot_id, total_amount, breakdown) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 10000, '{"1st": 5000, "2nd": 3000, "3rd": 1500, "4th": 500}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample winning assigned
INSERT INTO winnings (id, slot_id, team_id, position, amount_won) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440001', 1, 5000)
ON CONFLICT (id) DO NOTHING;
