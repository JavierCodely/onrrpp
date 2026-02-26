-- =============================================
-- DIAGNÓSTICO: Verificar estado de triggers de lotes
-- =============================================

-- 1. Verificar si los triggers existen
SELECT
    trigger_name,
    event_manipulation as evento,
    action_timing as momento,
    action_statement as accion
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name LIKE '%lote%'
ORDER BY trigger_name;

-- 2. Verificar el código de la función increment_lote_cantidad
SELECT pg_get_functiondef('increment_lote_cantidad'::regproc);

-- 3. Ver estado actual de los lotes
SELECT
    l.nombre as lote,
    l.cantidad_actual,
    l.cantidad_maxima,
    (l.cantidad_maxima - l.cantidad_actual) as disponibles,
    COUNT(i.id) as invitados_reales,
    e.nombre as evento
FROM public.lotes l
LEFT JOIN public.invitados i ON i.uuid_lote = l.id
LEFT JOIN public.eventos e ON e.id = l.uuid_evento
WHERE l.activo = true
GROUP BY l.id, l.nombre, l.cantidad_actual, l.cantidad_maxima, e.nombre
ORDER BY e.nombre, l.nombre;

-- 4. Verificar si hay discrepancias entre cantidad_actual y invitados reales
SELECT
    l.nombre as lote,
    l.cantidad_actual as cantidad_en_db,
    COUNT(i.id) as invitados_reales,
    (l.cantidad_actual - COUNT(i.id)) as diferencia,
    CASE
        WHEN l.cantidad_actual != COUNT(i.id) THEN '⚠️ DISCREPANCIA'
        ELSE '✅ OK'
    END as estado
FROM public.lotes l
LEFT JOIN public.invitados i ON i.uuid_lote = l.id
WHERE l.activo = true
GROUP BY l.id, l.nombre, l.cantidad_actual
HAVING l.cantidad_actual != COUNT(i.id)
ORDER BY l.nombre;

-- 5. Script para CORREGIR discrepancias (ejecutar solo si es necesario)
-- DESCOMENTAR Y EJECUTAR SOLO SI HAY DISCREPANCIAS:
/*
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
)
WHERE l.activo = true;
*/

-- 6. Verificar permisos en la tabla lotes
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'lotes';
