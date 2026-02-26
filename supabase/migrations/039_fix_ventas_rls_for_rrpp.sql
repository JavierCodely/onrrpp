-- =============================================
-- Migration: 039 - Fix Ventas RLS para RRPPs
-- Description: Permitir que RRPPs vean sus propias ventas y agregar política DELETE para RRPPs
-- =============================================

-- Eliminar política antigua de SELECT
DROP POLICY IF EXISTS "Users can view ventas of their club" ON public.ventas;

-- Nueva política de SELECT: separar Admin/Seguridad de RRPP
CREATE POLICY "Admins and Seguridad can view all ventas of their club"
ON public.ventas
FOR SELECT
USING (
    public.get_current_user_role() IN ('admin', 'seguridad')
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

CREATE POLICY "RRPP can view their own ventas"
ON public.ventas
FOR SELECT
USING (
    public.get_current_user_role() = 'rrpp'
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- Agregar política DELETE para RRPPs (pueden eliminar sus propias ventas)
DROP POLICY IF EXISTS "RRPP can delete their ventas" ON public.ventas;

CREATE POLICY "RRPP can delete their ventas"
ON public.ventas
FOR DELETE
USING (
    public.get_current_user_role() = 'rrpp'
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

COMMENT ON POLICY "Admins and Seguridad can view all ventas of their club" ON public.ventas IS
'Admin y Seguridad ven todas las ventas de su club';

COMMENT ON POLICY "RRPP can view their own ventas" ON public.ventas IS
'RRPP solo ve sus propias ventas';

COMMENT ON POLICY "RRPP can delete their ventas" ON public.ventas IS
'RRPP puede eliminar sus propias ventas (cuando cambia lote de pago a gratis)';
