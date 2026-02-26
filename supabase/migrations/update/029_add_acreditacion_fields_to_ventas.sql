-- =============================================
-- Update Migration: 029 - Add Acreditación Fields to Ventas
-- Description: Add entradas_acreditadas and comision_acreditada fields
-- =============================================

-- Add acreditación fields to ventas table
ALTER TABLE public.ventas
ADD COLUMN entradas_acreditadas BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN comision_acreditada BOOLEAN NOT NULL DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.ventas.entradas_acreditadas IS 'Indica si las entradas fueron acreditadas/pagadas al RRPP';
COMMENT ON COLUMN public.ventas.comision_acreditada IS 'Indica si la comisión fue acreditada/pagada al RRPP';

-- Create index for filtering
CREATE INDEX idx_ventas_entradas_acreditadas ON public.ventas(entradas_acreditadas);
CREATE INDEX idx_ventas_comision_acreditada ON public.ventas(comision_acreditada);

-- Grant permissions to admins to update these fields
-- (RLS policies already allow admins to update ventas)

-- Migration 029 completed successfully
