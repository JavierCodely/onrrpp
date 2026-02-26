-- =============================================
-- Migration: 021 - Verify and Fix Realtime
-- Description: Ensure realtime is properly enabled for eventos and invitados tables
-- Dependencies: 004_create_eventos.sql, 005_create_invitados.sql, 014_enable_realtime_eventos_invitados.sql
-- Version: 1.0 (Consolidated from 018_verify_and_fix_realtime.sql)
-- =============================================

-- First, check if tables are already in the publication
-- If not, add them. If yes, this will be a no-op.

DO $$
BEGIN
    -- Try to add eventos to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
        RAISE NOTICE 'Added eventos to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'eventos already in realtime publication';
    END;

    -- Try to add invitados to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.invitados;
        RAISE NOTICE 'Added invitados to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'invitados already in realtime publication';
    END;
END $$;

-- Verify the tables are in the publication
DO $$
DECLARE
    eventos_count INTEGER;
    invitados_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO eventos_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'eventos';

    SELECT COUNT(*)
    INTO invitados_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'invitados';

    IF eventos_count > 0 AND invitados_count > 0 THEN
        RAISE NOTICE 'Realtime verification successful: eventos and invitados are published ✅';
    ELSE
        RAISE WARNING 'Realtime verification failed: eventos=%, invitados=%', eventos_count, invitados_count;
    END IF;
END $$;
