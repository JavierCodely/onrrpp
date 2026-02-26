-- =============================================
-- Migration: 033 - Enable Realtime for Lotes Table
-- Description: Enable realtime subscriptions for lotes table so RRPPs get live updates
-- =============================================

-- Enable realtime for lotes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes;

-- Verify realtime is enabled
COMMENT ON TABLE public.lotes IS 'Lotes de invitados por evento con precios y categorías - Realtime enabled for live updates';
