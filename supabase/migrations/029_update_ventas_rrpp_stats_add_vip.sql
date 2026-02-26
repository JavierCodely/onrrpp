-- =============================================
-- Migration: 029 - Update ventas_rrpp_stats to include lote_es_vip
-- Description: Add es_vip field to the stats view
-- =============================================

-- Drop and recreate the view with the new field
DROP VIEW IF EXISTS public.ventas_rrpp_stats;

CREATE VIEW public.ventas_rrpp_stats AS
SELECT
    v.id_rrpp,
    v.uuid_evento,
    v.uuid_lote,
    l.nombre as lote_nombre,
    l.precio as lote_precio,
    l.es_vip as lote_es_vip,
    l.comision_tipo,
    l.comision_rrpp_monto,
    l.comision_rrpp_porcentaje,
    COUNT(v.id) as cantidad_ventas,
    SUM(v.monto_total) as monto_total_vendido,
    SUM(v.monto_efectivo) as monto_efectivo,
    SUM(v.monto_transferencia) as monto_transferencia,
    -- Calculate commission based on type
    CASE
        WHEN l.comision_tipo = 'monto' THEN COUNT(v.id) * l.comision_rrpp_monto
        WHEN l.comision_tipo = 'porcentaje' THEN SUM(v.monto_total) * (l.comision_rrpp_porcentaje / 100)
        ELSE 0
    END as comision_total
FROM public.ventas v
JOIN public.lotes l ON v.uuid_lote = l.id
GROUP BY
    v.id_rrpp,
    v.uuid_evento,
    v.uuid_lote,
    l.nombre,
    l.precio,
    l.es_vip,
    l.comision_tipo,
    l.comision_rrpp_monto,
    l.comision_rrpp_porcentaje;

-- Add comment
COMMENT ON VIEW public.ventas_rrpp_stats IS 'Vista con estadísticas de ventas por RRPP, evento y lote, incluyendo comisiones calculadas y tipo de lote (VIP/Normal)';

-- Grant permissions
GRANT SELECT ON public.ventas_rrpp_stats TO authenticated;
