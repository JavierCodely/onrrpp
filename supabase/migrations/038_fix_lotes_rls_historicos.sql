-- =============================================
-- Migration: 038 - Fix Lotes RLS para permitir ver lotes históricos
-- Description: Permitir que RRPPs vean lotes que están asociados a sus invitados,
--              incluso si ya no pertenecen a ese grupo
-- Dependencies: 030_add_grupos_to_personal_and_lotes.sql
-- =============================================

-- Eliminar política antigua
DROP POLICY IF EXISTS "RRPPs can view lotes of their grupo or without grupo" ON public.lotes;

-- Nueva política mejorada: RRPPs pueden ver lotes de su grupo, sin grupo, O que estén asociados a sus invitados
CREATE POLICY "RRPPs can view lotes of their grupo, without grupo, or their invitados"
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
        -- RRPP ve lotes de su grupo, sin grupo, O lotes usados en sus invitados
        (
            public.get_current_user_role() = 'rrpp'
            AND (
                -- Lote sin grupo (visible para todos)
                grupo IS NULL
                OR
                -- Lote del grupo actual del RRPP
                grupo = (SELECT grupo FROM public.personal WHERE id = auth.uid())
                OR
                -- NUEVO: Lote histórico - está asociado a algún invitado del RRPP
                id IN (
                    SELECT uuid_lote
                    FROM public.invitados
                    WHERE id_rrpp = auth.uid()
                )
            )
        )
    )
);

COMMENT ON POLICY "RRPPs can view lotes of their grupo, without grupo, or their invitados" ON public.lotes IS
'Admin y Seguridad ven todos los lotes. RRPP ve lotes de su grupo actual, lotes sin grupo, y lotes históricos asociados a sus invitados.';

-- =============================================
-- EXPLICACIÓN
-- =============================================
--
-- Esta política permite que un RRPP vea un lote si se cumple CUALQUIERA de estas condiciones:
--
-- 1. El lote no tiene grupo asignado (grupo IS NULL) - visible para todos los RRPPs
--
-- 2. El lote pertenece al grupo ACTUAL del RRPP - permite crear nuevos invitados
--
-- 3. El lote está asociado a algún invitado creado por el RRPP - permite ver invitados históricos
--    Esto significa que si un RRPP del grupo A creó un invitado con el lote del grupo A,
--    y luego se cambia al RRPP al grupo B, seguirá viendo ese lote porque está en sus invitados.
--
-- Casos de uso:
-- - RRPP del grupo A crea invitado con lote del grupo A ✓
-- - RRPP cambia del grupo A al grupo B
-- - RRPP puede ver sus invitados antiguos con el lote del grupo A ✓ (gracias a la tercera condición)
-- - RRPP puede crear nuevos invitados con lotes del grupo B ✓ (gracias a la segunda condición)
-- - RRPP NO puede crear nuevos invitados con lotes del grupo A ✗ (ya no está en ese grupo)
--
