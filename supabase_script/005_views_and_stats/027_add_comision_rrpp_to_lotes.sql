-- =============================================
-- Migration: 027 - Add RRPP Commission to Lotes
-- Description: Add commission fields to lotes table for RRPP earnings
-- Dependencies: 012_create_lotes.sql, 013_create_ventas.sql
-- Version: 1.0 (Consolidated from 028_add_comision_rrpp_to_lotes.sql)
-- =============================================

-- ========================================
-- STEP 1: Create commission type enum
-- ========================================

CREATE TYPE comision_tipo AS ENUM ('monto', 'porcentaje');

COMMENT ON TYPE comision_tipo IS 'Tipo de comisión para RRPP: monto fijo o porcentaje del precio';

-- ========================================
-- STEP 2: Add commission fields to lotes table
-- ========================================

ALTER TABLE public.lotes
ADD COLUMN IF NOT EXISTS comision_tipo comision_tipo NOT NULL DEFAULT 'monto',
ADD COLUMN IF NOT EXISTS comision_rrpp_monto DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comision_rrpp_porcentaje DECIMAL(5, 2) DEFAULT 0;

-- ========================================
-- STEP 3: Add constraints
-- ========================================

ALTER TABLE public.lotes
DROP CONSTRAINT IF EXISTS comision_monto_valido,
DROP CONSTRAINT IF EXISTS comision_porcentaje_valido,
DROP CONSTRAINT IF EXISTS comision_tipo_valido;

ALTER TABLE public.lotes
ADD CONSTRAINT comision_monto_valido CHECK (comision_rrpp_monto >= 0),
ADD CONSTRAINT comision_porcentaje_valido CHECK (comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100),
ADD CONSTRAINT comision_tipo_valido CHECK (
    (comision_tipo = 'monto' AND comision_rrpp_monto >= 0) OR
    (comision_tipo = 'porcentaje' AND comision_rrpp_porcentaje >= 0 AND comision_rrpp_porcentaje <= 100)
);

-- ========================================
-- STEP 4: Add comments
-- ========================================

COMMENT ON COLUMN public.lotes.comision_tipo IS 'Tipo de comisión: monto fijo o porcentaje del precio';
COMMENT ON COLUMN public.lotes.comision_rrpp_monto IS 'Comisión fija en pesos para el RRPP por cada venta de este lote';
COMMENT ON COLUMN public.lotes.comision_rrpp_porcentaje IS 'Comisión en porcentaje del precio para el RRPP por cada venta de este lote';

-- ========================================
-- STEP 5: Create view for RRPP sales statistics with commissions by lote
-- ========================================

CREATE OR REPLACE VIEW public.ventas_rrpp_stats AS
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

-- Add comment to view
COMMENT ON VIEW public.ventas_rrpp_stats IS 'Vista con estadísticas de ventas por RRPP, evento y lote, incluyendo comisiones calculadas';

-- Enable RLS on the view
ALTER VIEW public.ventas_rrpp_stats SET (security_invoker = true);

-- Grant select permissions
GRANT SELECT ON public.ventas_rrpp_stats TO authenticated;
