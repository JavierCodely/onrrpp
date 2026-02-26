-- =============================================
-- VERIFICACIÓN: ¿Por qué no se actualiza el contador?
-- =============================================

-- 1. Verificar que los triggers existen
SELECT
    trigger_name,
    event_manipulation as evento,
    action_timing as cuando,
    event_object_table as tabla
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name LIKE 'trg_%'
ORDER BY trigger_name;

-- DEBE MOSTRAR:
-- trg_cambiar_lote       | UPDATE | AFTER | invitados
-- trg_decrementar_lote   | DELETE | AFTER | invitados
-- trg_incrementar_lote   | INSERT | AFTER | invitados

-- 2. Ver el código de la función de incrementar
SELECT pg_get_functiondef('fn_incrementar_lote'::regproc);

-- 3. Ver estado ACTUAL de los lotes
SELECT
    nombre,
    cantidad_actual as contador,
    cantidad_maxima as maximo,
    (cantidad_maxima - cantidad_actual) as disponibles,
    activo
FROM public.lotes
ORDER BY nombre;

-- 4. Contar invitados REALES por lote
SELECT
    l.nombre as lote,
    l.cantidad_actual as contador_db,
    COUNT(i.id) as invitados_reales,
    (l.cantidad_actual - COUNT(i.id)) as diferencia
FROM public.lotes l
LEFT JOIN public.invitados i ON i.uuid_lote = l.id
GROUP BY l.id, l.nombre, l.cantidad_actual
ORDER BY l.nombre;

-- SI "diferencia" != 0 → Los contadores están mal

-- 5. Ver último invitado creado
SELECT
    nombre,
    apellido,
    uuid_lote,
    created_at
FROM public.invitados
ORDER BY created_at DESC
LIMIT 5;

-- 6. PROBAR MANUALMENTE si el trigger funciona
-- IMPORTANTE: Reemplaza los UUIDs con valores reales

-- Primero, obtener UUIDs válidos:
DO $$
DECLARE
    v_evento_id UUID;
    v_lote_id UUID;
    v_rrpp_id UUID;
    v_cantidad_antes INTEGER;
    v_cantidad_despues INTEGER;
BEGIN
    -- Obtener IDs de prueba
    SELECT id INTO v_evento_id FROM public.eventos LIMIT 1;
    SELECT id INTO v_lote_id FROM public.lotes WHERE activo = true LIMIT 1;
    SELECT id INTO v_rrpp_id FROM public.personal WHERE rol = 'rrpp' LIMIT 1;

    RAISE NOTICE '====================================';
    RAISE NOTICE 'PRUEBA MANUAL DEL TRIGGER';
    RAISE NOTICE '====================================';

    IF v_evento_id IS NULL OR v_lote_id IS NULL OR v_rrpp_id IS NULL THEN
        RAISE NOTICE '❌ No hay datos de prueba disponibles';
        RETURN;
    END IF;

    -- Ver cantidad antes
    SELECT cantidad_actual INTO v_cantidad_antes FROM public.lotes WHERE id = v_lote_id;
    RAISE NOTICE 'Cantidad ANTES: %', v_cantidad_antes;

    -- Crear invitado de prueba
    INSERT INTO public.invitados (
        nombre,
        apellido,
        edad,
        dni,
        sexo,
        uuid_evento,
        uuid_lote,
        id_rrpp
    ) VALUES (
        'Test',
        'Trigger',
        25,
        'TEST-TRIGGER-' || NOW(),
        'hombre',
        v_evento_id,
        v_lote_id,
        v_rrpp_id
    );

    -- Ver cantidad después
    SELECT cantidad_actual INTO v_cantidad_despues FROM public.lotes WHERE id = v_lote_id;
    RAISE NOTICE 'Cantidad DESPUÉS: %', v_cantidad_despues;

    IF v_cantidad_despues = v_cantidad_antes + 1 THEN
        RAISE NOTICE '✅ EL TRIGGER FUNCIONA CORRECTAMENTE';
    ELSE
        RAISE NOTICE '❌ EL TRIGGER NO FUNCIONA';
        RAISE NOTICE 'Esperado: %', v_cantidad_antes + 1;
        RAISE NOTICE 'Obtenido: %', v_cantidad_despues;
    END IF;

    -- Limpiar invitado de prueba
    DELETE FROM public.invitados WHERE nombre = 'Test' AND apellido = 'Trigger';

    RAISE NOTICE '====================================';
END $$;

-- 7. Verificar permisos
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('lotes', 'invitados')
  AND grantee IN ('authenticated', 'anon', 'postgres')
ORDER BY table_name, grantee;

-- El usuario 'authenticated' necesita UPDATE en 'lotes'
