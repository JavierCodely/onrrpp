-- =============================================
-- Migration: 026 - Debug and Fix RRPP Events View
-- Description: First debug, then fix the view
-- =============================================

-- Step 1: Check what tables exist
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE tablename IN ('eventos', 'personal', 'invitados')
ORDER BY schemaname, tablename;

-- Step 2: Check if view exists
SELECT
    schemaname,
    viewname
FROM pg_views
WHERE viewname = 'eventos_rrpp_stats';

-- Step 3: See current search path
SHOW search_path;
