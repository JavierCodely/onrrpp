-- =============================================
-- Migration: 011 - Enable Realtime for Eventos
-- Description: Enable realtime updates for eventos table
--              to track total_invitados and total_ingresados changes
-- =============================================

-- Enable realtime for eventos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;

-- Optional: Enable realtime for invitados table as well
-- This allows tracking when guests are added/removed/checked-in
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitados;

-- Add comment
COMMENT ON TABLE public.eventos IS 'Eventos del club - Solo admins pueden crear. Realtime enabled for counter updates.';
COMMENT ON TABLE public.invitados IS 'Invitados de eventos - Realtime enabled for guest tracking.';
