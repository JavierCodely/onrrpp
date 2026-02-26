-- =============================================
-- Migration: 037 - Fix Ventas Update Policy and Allow RRPP Delete
-- Description: Update RLS policies to allow RRPP to delete their ventas
-- Dependencies: 013_create_ventas.sql, 020_rls_policies_consolidated.sql
-- Version: 1.0 (Consolidated from 030_fix_ventas_update_policy.sql + 035_prevent_edit_ingresados_and_allow_rrpp_delete_ventas.sql)
-- Note: This resolves the duplicate 030 numbering issue
-- =============================================

-- ========================================
-- STEP 1: Add policy to allow RRPP to delete their own ventas
-- ========================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "RRPP can delete their ventas" ON public.ventas;

-- Create policy to allow RRPP to delete their own ventas
-- This is useful when changing from paid lote to free lote
CREATE POLICY "RRPP can delete their ventas"
ON public.ventas
FOR DELETE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

COMMENT ON POLICY "RRPP can delete their ventas" ON public.ventas IS
'RRPP pueden eliminar sus propias ventas (útil al cambiar de lote pago a lote gratuito)';

-- ========================================
-- NOTES
-- ========================================

-- Con esta migración:
-- 1. RRPP pueden eliminar sus propias ventas
-- 2. Esto permite cambiar un invitado de un lote pago a un lote gratuito
-- 3. Los admins mantienen permiso para eliminar cualquier venta de su club
-- 4. La política de DELETE ya existente para admins se mantiene sin cambios
