-- =============================================
-- Migration: 035 - Enable Realtime for Lotes Table
-- Description: Enable realtime subscriptions for lotes table so RRPPs get live updates
-- Dependencies: 012_create_lotes.sql, 014_enable_realtime_eventos_invitados.sql
-- Version: 1.0 (Consolidated from 033_enable_realtime_lotes.sql)
-- =============================================

-- Enable realtime for lotes table
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes;
        RAISE NOTICE 'Added lotes to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'lotes already in realtime publication';
    END;
END $$;

-- Verify the table is in the publication
DO $$
DECLARE
    lotes_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO lotes_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'lotes';

    IF lotes_count > 0 THEN
        RAISE NOTICE 'Realtime verification successful: lotes table is published ✅';
    ELSE
        RAISE WARNING 'Realtime verification failed: lotes not found in publication';
    END IF;
END $$;

-- Update comment
COMMENT ON TABLE public.lotes IS 'Lotes de invitados por evento con precios y categorías - Realtime enabled for live updates';
