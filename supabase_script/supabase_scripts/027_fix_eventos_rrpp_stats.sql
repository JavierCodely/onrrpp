-- =============================================
-- Migration: 025 - Fix RRPP Events View
-- Description: Show ALL active events to RRPP, even without invitados
--              Each RRPP sees their individual counters (mis_invitados, mis_ingresados)
-- =============================================

-- Drop the old view if it exists
DROP VIEW IF EXISTS eventos_rrpp_stats CASCADE;

-- Create improved view that shows ALL active events for each RRPP
-- Even if they don't have invitados yet, they'll see the event with 0 counters
CREATE VIEW eventos_rrpp_stats AS
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
FROM eventos e
CROSS JOIN personal p
LEFT JOIN invitados i ON i.uuid_evento = e.id AND i.id_rrpp = p.id
WHERE
    p.rol = 'rrpp'
    AND p.activo = true
    AND p.uuid_club = e.uuid_club
GROUP BY e.id, e.nombre, e.fecha, e.banner_url, e.estado, e.uuid_club, p.id;

-- Grant permissions
GRANT SELECT ON eventos_rrpp_stats TO authenticated;

-- Add comment
COMMENT ON VIEW eventos_rrpp_stats IS 'Vista que muestra TODOS los eventos activos para cada RRPP con sus contadores individuales (mis_invitados, mis_ingresados)';
