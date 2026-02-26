-- =============================================
-- Migration: 025 - Add RRPP Counters View
-- Description: Create a view for RRPP to see their own invitados and ingresados count per event
-- Dependencies: 004_create_eventos.sql, 005_create_invitados.sql
-- Version: 1.0 (Consolidated from 020_add_rrpp_counters_view.sql)
-- =============================================

-- Create a view that shows each RRPP's stats per event
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
LEFT JOIN public.invitados i ON i.uuid_evento = e.id AND i.id_rrpp IS NOT NULL
GROUP BY e.id, e.nombre, e.fecha, e.banner_url, e.estado, e.uuid_club, i.id_rrpp
HAVING i.id_rrpp IS NOT NULL;

-- Grant permissions
GRANT SELECT ON public.eventos_rrpp_stats TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.eventos_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.eventos_rrpp_stats IS 'Vista que muestra estadísticas de invitados por RRPP en cada evento';
