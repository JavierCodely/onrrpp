-- =============================================
-- Migration: 018 - Verify and Fix Realtime Configuration
-- Description: Ensure realtime is properly configured for eventos table
-- =============================================

-- Remove tables from publication (ignore errors if they don't exist)
DO $$
BEGIN
    -- Try to drop eventos from publication
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.eventos;
    EXCEPTION
        WHEN undefined_object THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Try to drop invitados from publication
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.invitados;
    EXCEPTION
        WHEN undefined_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitados;

-- Add helpful comments
COMMENT ON TABLE public.eventos IS 'Eventos - Realtime enabled for total_invitados and total_ingresados counters';
COMMENT ON TABLE public.invitados IS 'Invitados - Realtime enabled for guest tracking';
