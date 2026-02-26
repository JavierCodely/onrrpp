-- =============================================
-- Migration: 023 - Force Recalculate Counters NOW
-- Description: Manually recalculate all counters with actual data
-- =============================================

-- Show current state BEFORE
SELECT 'BEFORE' as moment, id, nombre, total_invitados, total_ingresados
FROM public.eventos;

-- Count actual invitados
SELECT
    'ACTUAL COUNT' as info,
    e.id,
    e.nombre,
    COUNT(i.id) as invitados_reales,
    COUNT(i.id) FILTER (WHERE i.ingresado = true) as ingresados_reales
FROM public.eventos e
LEFT JOIN public.invitados i ON i.uuid_evento = e.id
GROUP BY e.id, e.nombre;

-- Update each event with actual counts
UPDATE public.eventos e
SET
    total_invitados = (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
    ),
    total_ingresados = (
        SELECT COUNT(*)
        FROM public.invitados i
        WHERE i.uuid_evento = e.id
        AND i.ingresado = true
    );

-- Show current state AFTER
SELECT 'AFTER' as moment, id, nombre, total_invitados, total_ingresados
FROM public.eventos;
