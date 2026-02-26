-- =============================================
-- Migration: 037 - Enable Realtime for Ventas Table
-- Description: Enable realtime subscriptions for ventas table so RRPPs get live updates
-- =============================================

-- Enable realtime for ventas table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas;

-- Verify realtime is enabled
COMMENT ON TABLE public.ventas IS 'Ventas de entradas con información de pago - Realtime enabled for live updates';
