-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  team_id uuid NOT NULL,
  date date NOT NULL,
  session_time text NOT NULL CHECK (session_time IN ('Morning', 'Evening', 'Night', 'Match')),
  status text NOT NULL CHECK (status IN ('Present', 'Absent', 'Auto (Match)')),
  marked_by uuid,
  slot_id uuid, -- Link to specific slot for match attendance
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT attendances_pkey PRIMARY KEY (id),
  CONSTRAINT attendances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT attendances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT attendances_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT attendances_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE SET NULL,
  
  -- Prevent duplicate attendance for same player, date, and session
  CONSTRAINT attendances_unique_player_date_session UNIQUE(player_id, date, session_time)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_player_date ON public.attendances(player_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_team_date ON public.attendances(team_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_session_date ON public.attendances(session_time, date);
CREATE INDEX IF NOT EXISTS idx_attendances_slot_id ON public.attendances(slot_id);

-- Enable RLS
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendances table

-- Players can view their own attendance records
CREATE POLICY "Players can view own attendance" ON public.attendances
  FOR SELECT USING (
    auth.uid() = player_id
  );

-- Team members can view attendance for their team
CREATE POLICY "Team members can view team attendance" ON public.attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND team_id = attendances.team_id
      AND role IN ('coach', 'admin', 'manager', 'analyst')
    )
  );

-- Admins and managers can view all attendance
CREATE POLICY "Admins and managers can view all attendance" ON public.attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Players can insert their own attendance
CREATE POLICY "Players can mark own attendance" ON public.attendances
  FOR INSERT WITH CHECK (
    auth.uid() = player_id
    AND marked_by = auth.uid()
  );

-- Coaches can mark attendance for their team players
CREATE POLICY "Coaches can mark team attendance" ON public.attendances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users coach
      WHERE coach.id = auth.uid() 
      AND coach.role = 'coach'
      AND coach.team_id = attendances.team_id
    )
    AND EXISTS (
      SELECT 1 FROM public.users player
      WHERE player.id = attendances.player_id
      AND player.team_id = attendances.team_id
    )
  );

-- Admins and managers can mark attendance for any player
CREATE POLICY "Admins and managers can mark any attendance" ON public.attendances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Auto attendance insertion (for match performance entries)
CREATE POLICY "System can insert auto attendance" ON public.attendances
  FOR INSERT WITH CHECK (
    status = 'Auto (Match)'
    AND marked_by IS NULL
  );

-- Function to automatically create attendance when performance is recorded
CREATE OR REPLACE FUNCTION public.create_auto_attendance()
RETURNS TRIGGER AS $$
DECLARE
  slot_date date;
  slot_team_id uuid;
BEGIN
  -- Get slot information if slot is linked to performance
  IF NEW.slot IS NOT NULL THEN
    SELECT date, team_id INTO slot_date, slot_team_id
    FROM public.slots
    WHERE id = NEW.slot;
    
    -- Use slot date and team_id if available
    IF slot_date IS NOT NULL AND slot_team_id IS NOT NULL THEN
      INSERT INTO public.attendances (player_id, team_id, date, session_time, status, marked_by, slot_id)
      SELECT 
        NEW.player_id,
        slot_team_id,
        slot_date,
        'Match',
        'Auto (Match)',
        NULL,
        NEW.slot
      WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND date = slot_date 
        AND session_time = 'Match'
      );
    END IF;
  ELSE
    -- Fallback to current date if no slot information
    INSERT INTO public.attendances (player_id, team_id, date, session_time, status, marked_by, slot_id)
    SELECT 
      NEW.player_id,
      NEW.team_id,
      CURRENT_DATE,
      'Match',
      'Auto (Match)',
      NULL,
      NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.attendances 
      WHERE player_id = NEW.player_id 
      AND date = CURRENT_DATE 
      AND session_time = 'Match'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create attendance on performance entry
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_attendance();

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.attendances TO authenticated;