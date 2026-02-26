-- =============================================
-- DIAGNÓSTICO COMPLETO: Por qué dice "lote no existe"
-- =============================================

-- 1. Ver TODOS los lotes (activos e inactivos)
SELECT
    id,
    nombre,
    activo,
    cantidad_actual,
    cantidad_maxima,
    uuid_evento,
    created_at
FROM public.lotes
ORDER BY created_at DESC;

-- 2. Ver TODOS los eventos
SELECT
    id,
    nombre,
    estado,
    created_at
FROM public.eventos
ORDER BY created_at DESC;

-- 3. Ver la relación lotes-eventos
SELECT
    e.nombre as evento,
    l.nombre as lote,
    l.activo as lote_activo,
    e.estado as evento_activo,
    l.cantidad_actual,
    l.cantidad_maxima
FROM public.lotes l
INNER JOIN public.eventos e ON e.id = l.uuid_evento
ORDER BY e.nombre, l.nombre;

-- 4. Ver si hay invitados sin lote
SELECT
    COUNT(*) as total,
    COUNT(uuid_lote) as con_lote,
    COUNT(*) - COUNT(uuid_lote) as sin_lote
FROM public.invitados;

-- 5. Ver invitados recientes con sus lotes
SELECT
    i.nombre,
    i.apellido,
    i.uuid_lote,
    l.nombre as nombre_lote,
    i.created_at
FROM public.invitados i
LEFT JOIN public.lotes l ON l.id = i.uuid_lote
ORDER BY i.created_at DESC
LIMIT 10;

-- 6. Verificar los triggers actualmente instalados
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
ORDER BY trigger_name;

-- 7. Ver el código de la función que está causando el error
SELECT pg_get_functiondef('incrementar_lote_al_crear'::regproc);

-- 8. Probar manualmente la lógica del trigger
-- IMPORTANTE: Reemplaza 'uuid-del-lote-aqui' con un ID real de un lote de la query #1
DO $$
DECLARE
    v_lote_id UUID := 'uuid-del-lote-aqui'; -- CAMBIA ESTO
    v_cantidad_actual INTEGER;
    v_cantidad_maxima INTEGER;
    v_nombre_lote TEXT;
BEGIN
    SELECT cantidad_actual, cantidad_maxima, nombre
    INTO v_cantidad_actual, v_cantidad_maxima, v_nombre_lote
    FROM public.lotes
    WHERE id = v_lote_id AND activo = true;

    IF NOT FOUND THEN
        RAISE NOTICE '❌ El lote NO EXISTE o NO ESTÁ ACTIVO';
    ELSE
        RAISE NOTICE '✅ Lote encontrado: %', v_nombre_lote;
        RAISE NOTICE '   Cantidad actual: %', v_cantidad_actual;
        RAISE NOTICE '   Cantidad máxima: %', v_cantidad_maxima;
        RAISE NOTICE '   Disponibles: %', v_cantidad_maxima - v_cantidad_actual;

        IF v_cantidad_actual >= v_cantidad_maxima THEN
            RAISE NOTICE '⚠️  El lote está LLENO';
        ELSE
            RAISE NOTICE '✅ Hay espacio disponible';
        END IF;
    END IF;
END $$;
