-- =============================================
-- Migration: 046 - Cleanup Redundant Fields from Invitados (OPTIONAL)
-- Description: Remove redundant fields from invitados after confirming migration works
-- Dependencies: 045_migrate_existing_invitados_to_clientes.sql
-- Version: 1.0
-- IMPORTANTE: Solo ejecutar este script DESPUÉS de confirmar que todo funciona correctamente
-- =============================================

-- ========================================
-- ADVERTENCIA: Este script elimina datos permanentemente
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '⚠️  ══════════════════════════════════════════';
    RAISE NOTICE '⚠️  ADVERTENCIA: Este script eliminará columnas';
    RAISE NOTICE '⚠️  de la tabla invitados de forma permanente';
    RAISE NOTICE '⚠️  ══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Columnas que se eliminarán:';
    RAISE NOTICE '   - nombre';
    RAISE NOTICE '   - apellido';
    RAISE NOTICE '   - edad';
    RAISE NOTICE '   - fecha_nacimiento';
    RAISE NOTICE '   - sexo';
    RAISE NOTICE '   - departamento';
    RAISE NOTICE '   - localidad';
    RAISE NOTICE '   - dni';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Estos datos ahora están en la tabla clientes';
    RAISE NOTICE '   y son accesibles mediante uuid_cliente';
    RAISE NOTICE '';
END $$;

-- ========================================
-- PASO 1: Verificación previa
-- ========================================

DO $$
DECLARE
    invitados_sin_cliente INTEGER;
BEGIN
    -- Verificar que todos los invitados tengan un cliente asignado
    SELECT COUNT(*) INTO invitados_sin_cliente
    FROM public.invitados
    WHERE uuid_cliente IS NULL;

    IF invitados_sin_cliente > 0 THEN
        RAISE EXCEPTION '❌ ERROR: Hay % invitados sin cliente asignado. Ejecuta primero la migración 045.', invitados_sin_cliente;
    END IF;

    RAISE NOTICE '✅ Verificación OK: Todos los invitados tienen cliente asignado';
END $$;

-- ========================================
-- PASO 2: Actualizar RLS policies que dependen de campos eliminados
-- ========================================

-- Eliminar policy que referencia campos a eliminar
DROP POLICY IF EXISTS "Seguridad can update ingresado status" ON public.invitados;

-- Recrear policy sin referencias a campos eliminados
CREATE POLICY "Seguridad can update ingresado status"
ON public.invitados
FOR UPDATE
USING (
    public.check_user_has_role('seguridad'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id = invitados.uuid_evento
        AND e.uuid_club = public.get_current_user_club()
    )
)
WITH CHECK (
    -- Solo permitir actualizar ingresado y fecha_ingreso
    uuid_cliente = (SELECT uuid_cliente FROM public.invitados WHERE id = invitados.id)
    AND uuid_evento = (SELECT uuid_evento FROM public.invitados WHERE id = invitados.id)
    AND id_rrpp = (SELECT id_rrpp FROM public.invitados WHERE id = invitados.id)
    AND uuid_lote = (SELECT uuid_lote FROM public.invitados WHERE id = invitados.id)
    AND profile_image_url = (SELECT profile_image_url FROM public.invitados WHERE id = invitados.id)
    AND qr_code = (SELECT qr_code FROM public.invitados WHERE id = invitados.id)
);

RAISE NOTICE '✅ Políticas RLS actualizadas';

-- ========================================
-- PASO 3: Eliminar índices que dependen de columnas a eliminar
-- ========================================

DROP INDEX IF EXISTS public.idx_invitados_dni;
DROP INDEX IF EXISTS public.idx_invitados_nombre_apellido;
DROP INDEX IF EXISTS public.idx_invitados_departamento;
DROP INDEX IF EXISTS public.idx_invitados_localidad;

RAISE NOTICE '✅ Índices redundantes eliminados';

-- ========================================
-- PASO 4: Eliminar columnas redundantes
-- ========================================

ALTER TABLE public.invitados
DROP COLUMN IF EXISTS nombre CASCADE,
DROP COLUMN IF EXISTS apellido CASCADE,
DROP COLUMN IF EXISTS edad CASCADE,
DROP COLUMN IF EXISTS fecha_nacimiento CASCADE,
DROP COLUMN IF EXISTS sexo CASCADE,
DROP COLUMN IF EXISTS departamento CASCADE,
DROP COLUMN IF EXISTS localidad CASCADE,
DROP COLUMN IF EXISTS dni CASCADE;

RAISE NOTICE '✅ Columnas redundantes eliminadas';

-- ========================================
-- PASO 5: Verificación final
-- ========================================

DO $$
DECLARE
    columnas_restantes TEXT[];
BEGIN
    SELECT array_agg(column_name::TEXT)
    INTO columnas_restantes
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitados'
    ORDER BY ordinal_position;

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE '📊 COLUMNAS RESTANTES EN INVITADOS';
    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE '%', array_to_string(columnas_restantes, ', ');
    RAISE NOTICE '';
    RAISE NOTICE '✅ Limpieza completada exitosamente';
    RAISE NOTICE '══════════════════════════════════════════';
END $$;

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

COMMENT ON TABLE public.invitados IS 'Entradas de invitados - Vinculados a clientes mediante uuid_cliente. Los datos personales están en tabla clientes.';
COMMENT ON COLUMN public.invitados.uuid_cliente IS 'Referencia al cliente - Todos los datos personales están en tabla clientes';
