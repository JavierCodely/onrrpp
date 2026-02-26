-- =============================================
-- Migration: 029 - Fix RRPP View with Inactive Lotes
-- Description: Update RRPP view to handle inactive lotes correctly
-- Dependencies: 026_rrpp_view_consolidated.sql, 032_add_lote_activo_validation.sql (from FASE 7)
-- Version: 1.0 (Consolidated from 034_fix_rrpp_view_inactive_lotes.sql)
-- =============================================

-- Drop and recreate view to ensure it handles inactive lotes
DROP VIEW IF EXISTS public.eventos_rrpp_stats;

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
-- Join with lotes to filter inactive lotes if needed
LEFT JOIN public.lotes l ON i.uuid_lote = l.id
WHERE i.id_rrpp IS NOT NULL
  -- Include invitados with no lote OR invitados with active lotes
  AND (i.uuid_lote IS NULL OR l.activo = true OR l.id IS NULL)
GROUP BY e.id, e.nombre, e.fecha, e.banner_url, e.estado, e.uuid_club, i.id_rrpp;

-- Grant permissions
GRANT SELECT ON public.eventos_rrpp_stats TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.eventos_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.eventos_rrpp_stats IS 'Vista de estadísticas de invitados por RRPP - incluye solo invitados de lotes activos o sin lote';
