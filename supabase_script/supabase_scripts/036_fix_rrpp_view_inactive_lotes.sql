-- =============================================
-- Migration: 034 - Fix RRPP View Inactive Lotes in Ventas
-- Description: Allow RRPPs to view inactive lotes when querying ventas
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "RRPPs can view lotes of their grupo or without grupo" ON public.lotes;

-- Recreate policy: RRPPs can view ALL lotes (active and inactive)
-- Validation for "lote must be active" is done at trigger level when creating invitados
CREATE POLICY "RRPPs can view lotes of their grupo or without grupo"
ON public.lotes
FOR SELECT
USING (
    -- Evento pertenece al club del usuario
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    AND (
        -- Admin y Seguridad ven todos los lotes
        public.get_current_user_role() IN ('admin', 'seguridad')
        OR
        -- RRPP ve TODOS los lotes (activos e inactivos) de su grupo o sin grupo
        -- Esto permite que vean lotes desactivados en sus ventas históricas
        (
            public.get_current_user_role() = 'rrpp'
            AND (
                grupo IS NULL
                OR grupo = (SELECT grupo FROM public.personal WHERE id = auth.uid())
            )
        )
    )
);

COMMENT ON POLICY "RRPPs can view lotes of their grupo or without grupo" ON public.lotes IS
'Todos los usuarios pueden ver lotes de su club. RRPP ve lotes de su grupo o sin grupo (activos e inactivos). La validación de lote activo se hace a nivel de trigger al crear invitados.';

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

-- IMPORTANTE: Con este cambio:
-- 1. RRPPs pueden VER todos los lotes (activos e inactivos) cuando consultan ventas
-- 2. RRPPs NO pueden CREAR invitados en lotes inactivos (validación en trigger increment_lote_cantidad)
-- 3. RRPPs NO pueden CAMBIAR un invitado a un lote inactivo (validación en trigger update_lote_cantidad)
-- 4. Esto soluciona el problema de que las ventas de lotes desactivados muestren "lote: null"
