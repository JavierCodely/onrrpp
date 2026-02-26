-- =============================================
-- Migration: 014 - Enable Realtime for Eventos and Invitados
-- Description: Enable realtime updates for eventos and invitados tables
--              to track total_invitados, total_ingresados changes, and guest updates
-- Dependencies: 004_create_eventos.sql, 005_create_invitados.sql
-- Version: 1.0 (Consolidated from 011_enable_realtime.sql)
-- Note: This resolves the duplicate 011 numbering issue
-- =============================================

-- Enable realtime for eventos table
-- Admins will see live updates of total_invitados and total_ingresados counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;

-- Enable realtime for invitados table
-- RRPP will see live updates when their invitados are added/modified/scanned
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitados;

-- Add comments
COMMENT ON TABLE public.eventos IS 'Eventos del club - Solo admins pueden crear. Realtime enabled for counter updates.';
COMMENT ON TABLE public.invitados IS 'Invitados de eventos - Realtime enabled for guest tracking.';
