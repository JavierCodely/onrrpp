-- =============================================
-- Migration: 022 - Fix All Counters (Admin and RRPP)
-- Description: Recalculate existing counters and fix the RRPP view
-- =============================================

-- ========================================
-- PART 1: Recalculate Admin Totals
-- ========================================

-- Set all counters to 0 first
UPDATE public.eventos
SET total_invitados = 0, total_ingresados = 0;

-- Recalculate total_invitados for all events
UPDATE public.eventos e
SET total_invitados = COALESCE((
    SELECT COUNT(*)::integer
    FROM public.invitados i
    WHERE i.uuid_evento = e.id
), 0);

-- Recalculate total_ingresados for all events
UPDATE public.eventos e
SET total_ingresados = COALESCE((
    SELECT COUNT(*)::integer
    FROM public.invitados i
    WHERE i.uuid_evento = e.id
    AND i.ingresado = true
), 0);

-- ========================================
-- PART 2: Fix RRPP Stats View
-- ========================================

-- Drop the old view if exists
DROP VIEW IF EXISTS public.eventos_rrpp_stats;

-- Create improved view that includes events even if RRPP has no invitados yet
CREATE OR REPLACE VIEW public.eventos_rrpp_stats AS
SELECT
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha as evento_fecha,
    e.banner_url as evento_banner_url,
    e.estado as evento_estado,
    e.uuid_club as evento_uuid_club,
    p.id as id_rrpp,
    COALESCE(COUNT(i.id), 0)::integer as mis_invitados,
    COALESCE(COUNT(i.id) FILTER (WHERE i.ingresado = true), 0)::integer as mis_ingresados
FROM public.eventos e
CROSS JOIN public.personal p
LEFT JOIN public.invitados i ON i.uuid_evento = e.id AND i.id_rrpp = p.id
WHERE p.rol = 'rrpp'
  AND p.uuid_club = e.uuid_club
  AND p.activo = true
GROUP BY e.id, e.nombre, e.fecha, e.banner_url, e.estado, e.uuid_club, p.id;

-- Grant permissions
GRANT SELECT ON public.eventos_rrpp_stats TO authenticated;

-- Add RLS to the view
ALTER VIEW public.eventos_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.eventos_rrpp_stats IS 'Vista que muestra estadísticas de invitados por RRPP en cada evento - incluye eventos sin invitados';

-- ========================================
-- PART 3: Verify results
-- ========================================

-- Check Admin totals
-- SELECT id, nombre, total_invitados, total_ingresados FROM public.eventos;

-- Check RRPP stats (replace USER_ID with actual RRPP user id)
-- SELECT * FROM public.eventos_rrpp_stats WHERE id_rrpp = 'USER_ID';
