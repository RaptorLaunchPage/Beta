-- ====================================================================
-- ⏰ SCHEDULED JOBS SETUP - SCRIPT #6
-- ====================================================================
-- This script sets up scheduled jobs using pg_cron extension
-- Run this after all triggers are set up
-- Note: pg_cron extension must be enabled in Supabase

-- ====================================================================
-- 1. ENABLE PG_CRON EXTENSION (if not already enabled)
-- ====================================================================

-- Enable pg_cron extension (Supabase may already have this enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ====================================================================
-- 2. DAILY AUTOMATION JOBS
-- ====================================================================

-- Job 1: Generate daily practice sessions at 6:00 AM
SELECT cron.schedule(
    'generate-daily-practice-sessions',
    '0 6 * * *', -- Every day at 6:00 AM
    'SELECT public.generate_daily_practice_sessions(CURRENT_DATE);'
);

-- Job 2: Auto-mark absence after cutoff time (runs every 30 minutes)
SELECT cron.schedule(
    'auto-mark-absence-after-cutoff',
    '*/30 * * * *', -- Every 30 minutes
    'SELECT public.auto_mark_absent_after_cutoff();'
);

-- ====================================================================
-- 3. WEEKLY MAINTENANCE JOBS
-- ====================================================================

-- Job 3: Clean up old Discord logs every Sunday at 2:00 AM
SELECT cron.schedule(
    'cleanup-old-discord-logs',
    '0 2 * * 0', -- Every Sunday at 2:00 AM
    'SELECT public.cleanup_old_discord_logs(30);'
);

-- Job 4: Clean up old attendance debug logs every Sunday at 2:30 AM
SELECT cron.schedule(
    'cleanup-attendance-debug-logs',
    '30 2 * * 0', -- Every Sunday at 2:30 AM
    'DELETE FROM public.attendance_debug_log WHERE timestamp < NOW() - INTERVAL ''7 days'';'
);

-- ====================================================================
-- 4. MONTHLY MAINTENANCE JOBS
-- ====================================================================

-- Job 5: Monthly data cleanup on 1st of month at 3:00 AM
SELECT cron.schedule(
    'monthly-data-cleanup',
    '0 3 1 * *', -- 1st of every month at 3:00 AM
    $$
    BEGIN
        -- Clean up old communication logs (keep 90 days)
        DELETE FROM public.communication_logs 
        WHERE timestamp < NOW() - INTERVAL '90 days';
        
        -- Clean up old attendance debug logs (keep 30 days)
        DELETE FROM public.attendance_debug_log 
        WHERE timestamp < NOW() - INTERVAL '30 days';
        
        -- Update team monthly stats (if function exists)
        -- This would be called if you have a function to recalculate monthly stats
        -- SELECT public.recalculate_team_monthly_stats();
    END;
    $$
);

-- ====================================================================
-- 5. HOURLY JOBS (OPTIONAL - FOR HIGH-TRAFFIC SYSTEMS)
-- ====================================================================

-- Job 6: Hourly health check and cleanup (optional)
SELECT cron.schedule(
    'hourly-health-check',
    '0 * * * *', -- Every hour
    $$
    BEGIN
        -- Log system health metrics
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES (
            'Hourly health check',
            jsonb_build_object(
                'timestamp', now(),
                'active_sessions', (SELECT COUNT(*) FROM public.sessions WHERE date = CURRENT_DATE),
                'pending_attendances', (SELECT COUNT(*) FROM public.attendances WHERE date = CURRENT_DATE AND status = 'pending')
            )
        );
    END;
    $$
);

-- ====================================================================
-- 6. VERIFY SCHEDULED JOBS
-- ====================================================================

-- Check what jobs were created
DO $$
DECLARE
    job_count integer;
BEGIN
    SELECT COUNT(*) INTO job_count
    FROM cron.job;
    
    RAISE NOTICE '✅ Scheduled jobs setup completed successfully!';
    RAISE NOTICE '⏰ Created % scheduled jobs', job_count;
    RAISE NOTICE '📅 Jobs are now running automatically!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Job Schedule Summary:';
    RAISE NOTICE '  • Daily practice sessions: 6:00 AM daily';
    RAISE NOTICE '  • Auto-mark absence: Every 30 minutes';
    RAISE NOTICE '  • Discord log cleanup: Sundays 2:00 AM';
    RAISE NOTICE '  • Debug log cleanup: Sundays 2:30 AM';
    RAISE NOTICE '  • Monthly cleanup: 1st of month 3:00 AM';
    RAISE NOTICE '  • Health check: Every hour';
END $$;