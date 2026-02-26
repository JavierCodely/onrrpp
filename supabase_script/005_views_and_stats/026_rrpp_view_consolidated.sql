-- =============================================
-- Migration: 026 - RRPP View Consolidated (FINAL VERSION)
-- Description: Fix and consolidate RRPP stats view
-- Dependencies: 025_add_rrpp_counters_view.sql
-- Version: 2.0 CONSOLIDATED
-- Consolidates: 020_add_rrpp_counters_view.sql + 025_fix_eventos_rrpp_stats.sql
--               + 026_debug_and_fix_rrpp_view.sql
-- Changes from original:
--   - Fixed NULL handling for RRPPs with no invitados
--   - Improved performance with better GROUP BY logic
-- =============================================

-- Drop existing view
DROP VIEW IF EXISTS public.eventos_rrpp_stats;

-- Recreate view with fixes
CREATE OR REPLACE VIEW public.eventos_rrpp_stats AS
SELECT
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha as evento_fecha,
    e.banner_url as evento_banner_url,
    e.estado as evento_estado,
    e.uuid_club as evento_uuid_club,
    i.id_rrpp,
    COALESCE(COUNT(i.id), 0)::integer as mis_invitados,
    COALESCE(COUNT(i.id) FILTER (WHERE i.ingresado = true), 0)::integer as mis_ingresados
FROM public.eventos e
LEFT JOIN public.invitados i ON i.uuid_evento = e.id
WHERE i.id_rrpp IS NOT NULL
GROUP BY e.id, e.nombre, e.fecha, e.banner_url, e.estado, e.uuid_club, i.id_rrpp;

-- Grant permissions
GRANT SELECT ON public.eventos_rrpp_stats TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.eventos_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.eventos_rrpp_stats IS 'Vista consolidada que muestra estadísticas de invitados por RRPP en cada evento';
