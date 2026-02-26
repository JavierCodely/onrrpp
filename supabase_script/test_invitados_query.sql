-- =============================================
-- COLOCA TU CLUB_ID AQUÍ:
-- =============================================
-- Reemplaza 'TU-CLUB-UUID-AQUI' con el UUID de tu club
-- Ejemplo: '123e4567-e89b-12d3-a456-426614174000'

DO $$
DECLARE
  v_club_id UUID := 'TU-CLUB-UUID-AQUI'; -- ⬅️ CAMBIA ESTO
BEGIN
  -- Para obtener tu club_id, ejecuta este query primero:
  -- SELECT id, nombre FROM public.clubs LIMIT 5;

  -- Test 0: Verificar el club_id
  RAISE NOTICE '=== CLUB ID SELECCIONADO: % ===', v_club_id;
END $$;

-- Test 1: Contar invitados por grupo de RRPP (FILTRADO POR CLUB)
SELECT
  p.grupo as grupo_rrpp,
  COUNT(*) as total_invitados
FROM public.invitados i
INNER JOIN public.personal p ON p.id = i.id_rrpp
INNER JOIN public.eventos e ON e.id = i.uuid_evento
WHERE p.activo = true
  AND e.uuid_club = 'TU-CLUB-UUID-AQUI'::UUID -- ⬅️ CAMBIA ESTO
GROUP BY p.grupo
ORDER BY p.grupo;

-- Test 2: Ver algunos invitados de diferentes grupos (FILTRADO POR CLUB)
SELECT
  i.id,
  i.nombre,
  i.apellido,
  p.nombre as rrpp_nombre,
  p.grupo as grupo_rrpp,
  i.uuid_lote,
  e.nombre as evento_nombre
FROM public.invitados i
INNER JOIN public.personal p ON p.id = i.id_rrpp
INNER JOIN public.eventos e ON e.id = i.uuid_evento
WHERE p.activo = true
  AND e.uuid_club = 'TU-CLUB-UUID-AQUI'::UUID -- ⬅️ CAMBIA ESTO
LIMIT 20;

-- Test 3: Contar invitados agrupados por grupo del RRPP Y grupo del lote (FILTRADO POR CLUB)
SELECT
  p.grupo as grupo_rrpp,
  l.grupo as grupo_lote,
  COUNT(*) as total_invitados
FROM public.invitados i
INNER JOIN public.personal p ON p.id = i.id_rrpp
INNER JOIN public.eventos e ON e.id = i.uuid_evento
LEFT JOIN public.lotes l ON l.id = i.uuid_lote
WHERE p.activo = true
  AND e.uuid_club = 'TU-CLUB-UUID-AQUI'::UUID -- ⬅️ CAMBIA ESTO
GROUP BY p.grupo, l.grupo
ORDER BY p.grupo, l.grupo;

-- Test 4: Verificar cuántos RRPPs hay por grupo en el club
SELECT
  grupo,
  COUNT(*) as total_rrpps
FROM public.personal
WHERE rol = 'rrpp'
  AND activo = true
  AND uuid_club = 'TU-CLUB-UUID-AQUI'::UUID -- ⬅️ CAMBIA ESTO
GROUP BY grupo
ORDER BY grupo;

-- Test 5: Total general de invitados en el club (sin agrupar)
SELECT
  COUNT(*) as total_invitados_club
FROM public.invitados i
INNER JOIN public.eventos e ON e.id = i.uuid_evento
WHERE e.uuid_club = 'TU-CLUB-UUID-AQUI'::UUID; -- ⬅️ CAMBIA ESTO

-- =============================================
-- QUERY ADICIONAL: Para obtener tu club_id
-- =============================================
-- Ejecuta esto primero si no sabes tu club_id:
SELECT
  id as club_id,
  nombre as club_nombre
FROM public.clubs
LIMIT 10;
