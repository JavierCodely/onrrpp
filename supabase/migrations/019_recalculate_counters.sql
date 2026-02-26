-- =============================================
-- Migration: 019 - Recalculate Event Counters
-- Description: Recalculate total_invitados and total_ingresados for existing events
-- =============================================

-- Recalculate total_invitados for all events
UPDATE public.eventos e
SET total_invitados = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_evento = e.id
);

-- Recalculate total_ingresados for all events
UPDATE public.eventos e
SET total_ingresados = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_evento = e.id
    AND i.ingresado = true
);

-- Verify the results
-- SELECT id, nombre, total_invitados, total_ingresados FROM public.eventos;
