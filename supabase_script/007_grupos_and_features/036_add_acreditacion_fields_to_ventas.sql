-- =============================================
-- Migration: 036 - Add Acreditación Fields to Ventas
-- Description: Add entradas_acreditadas and comision_acreditada fields to track payment status
-- Dependencies: 013_create_ventas.sql
-- Version: 1.0 (Consolidated from update/029_add_acreditacion_fields_to_ventas.sql)
-- Note: This resolves the second duplicate 029 numbering issue
-- =============================================

-- ========================================
-- STEP 1: Add acreditación fields to ventas table
-- ========================================

ALTER TABLE public.ventas
ADD COLUMN IF NOT EXISTS entradas_acreditadas BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS comision_acreditada BOOLEAN NOT NULL DEFAULT false;

-- ========================================
-- STEP 2: Add comments
-- ========================================

COMMENT ON COLUMN public.ventas.entradas_acreditadas IS 'Indica si las entradas fueron acreditadas/pagadas al RRPP';
COMMENT ON COLUMN public.ventas.comision_acreditada IS 'Indica si la comisión fue acreditada/pagada al RRPP';

-- ========================================
-- STEP 3: Create indexes for filtering
-- ========================================

CREATE INDEX IF NOT EXISTS idx_ventas_entradas_acreditadas ON public.ventas(entradas_acreditadas);
CREATE INDEX IF NOT EXISTS idx_ventas_comision_acreditada ON public.ventas(comision_acreditada);

-- ========================================
-- NOTES
-- ========================================

-- Con esta migración:
-- 1. Admins pueden marcar cuando las entradas fueron acreditadas al RRPP
-- 2. Admins pueden marcar cuando la comisión fue acreditada al RRPP
-- 3. Se pueden generar reportes de pagos pendientes filtrando por estos campos

-- Grant permissions to admins to update these fields
-- (RLS policies already allow admins to update ventas)

-- Migration completed successfully
