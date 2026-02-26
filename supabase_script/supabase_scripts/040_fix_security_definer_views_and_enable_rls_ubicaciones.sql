-- =============================================
-- Migration: 038 - Fix Security Definer Views and Enable RLS on Ubicaciones
-- Description:
--   1. Fix eventos_rrpp_stats and ventas_rrpp_stats to use security_invoker = true
--   2. Enable RLS on ubicaciones table with read-only policy
-- =============================================

-- ========================================
-- PROBLEM 1: eventos_rrpp_stats has SECURITY DEFINER
-- ========================================
-- When the view was recreated in migration 025, the security_invoker setting was not re-applied
-- This causes the view to run with the creator's permissions instead of the querying user

-- Fix: Re-apply security_invoker = true to eventos_rrpp_stats
ALTER VIEW public.eventos_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.eventos_rrpp_stats IS
'Vista que muestra TODOS los eventos activos para cada RRPP con sus contadores individuales (mis_invitados, mis_ingresados).
SECURITY INVOKER: Ejecuta con permisos del usuario que consulta, respetando RLS.';

-- ========================================
-- PROBLEM 2: ventas_rrpp_stats has SECURITY DEFINER
-- ========================================
-- When the view was recreated in migration 029, the security_invoker setting was not re-applied

-- Fix: Re-apply security_invoker = true to ventas_rrpp_stats
ALTER VIEW public.ventas_rrpp_stats SET (security_invoker = true);

COMMENT ON VIEW public.ventas_rrpp_stats IS
'Vista con estadísticas de ventas por RRPP, evento y lote, incluyendo comisiones calculadas y tipo de lote (VIP/Normal).
SECURITY INVOKER: Ejecuta con permisos del usuario que consulta, respetando RLS.';

-- ========================================
-- PROBLEM 3: ubicaciones table has no RLS enabled
-- ========================================
-- The ubicaciones table is exposed to PostgREST but has no RLS policies
-- This is a security risk even though it's a read-only catalog

-- Enable RLS on ubicaciones table
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for all authenticated users
-- This table is a public catalog of Argentina departments/localities
-- All authenticated users should be able to read it
CREATE POLICY "All authenticated users can view ubicaciones"
ON public.ubicaciones
FOR SELECT
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "All authenticated users can view ubicaciones" ON public.ubicaciones IS
'Todos los usuarios autenticados pueden ver el catálogo de ubicaciones (departamentos y localidades).';

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 038 completed successfully:';
    RAISE NOTICE '   - eventos_rrpp_stats: security_invoker = true';
    RAISE NOTICE '   - ventas_rrpp_stats: security_invoker = true';
    RAISE NOTICE '   - ubicaciones: RLS enabled with read-only policy';
END $$;
