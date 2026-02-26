-- =============================================
-- Test Queries for Lotes-Seguridad Assignment System
-- Use these queries to test the functionality after running migrations 057 and 058
-- =============================================

-- ============================================
-- SECTION 1: Verification - Check Installation
-- ============================================

-- Check table exists
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'lotes_seguridad';

-- Check RLS is enabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'lotes_seguridad';

-- Check policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'lotes_seguridad'
ORDER BY policyname;

-- Check functions exist
SELECT
    routine_schema,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_seguridad_can_scan',
    'rechazar_invitado',
    'marcar_ingreso',
    'get_my_assigned_lotes',
    'validate_lotes_seguridad_role'
)
ORDER BY routine_name;

-- Check view exists
SELECT
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE table_name = 'seguridad_lotes_asignados';

-- Check triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lotes_seguridad';

-- Check constraints
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'lotes_seguridad';

-- ============================================
-- SECTION 2: Sample Data Setup
-- ============================================

-- Get UUIDs for testing (replace with actual values from your database)

-- List clubs
SELECT id, nombre FROM public.clubs;

-- List eventos activos
SELECT e.id, e.nombre, e.fecha, c.nombre as club
FROM public.eventos e
JOIN public.clubs c ON e.uuid_club = c.id
WHERE e.estado = true
ORDER BY e.fecha DESC;

-- List lotes
SELECT
    l.id,
    l.nombre,
    l.cantidad_actual,
    l.cantidad_maxima,
    l.es_vip,
    e.nombre as evento
FROM public.lotes l
JOIN public.eventos e ON l.uuid_evento = e.id
WHERE l.activo = true
ORDER BY e.nombre, l.nombre;

-- List personal de seguridad
SELECT
    p.id,
    p.nombre,
    p.apellido,
    p.activo,
    c.nombre as club
FROM public.personal p
JOIN public.clubs c ON p.uuid_club = c.id
WHERE p.rol = 'seguridad'
ORDER BY c.nombre, p.apellido, p.nombre;

-- ============================================
-- SECTION 3: Insert Test Assignment
-- ============================================

-- IMPORTANT: Replace with actual UUIDs from your database

-- Test 1: Assign seguridad to lote (should succeed)
-- Replace 'LOTE-UUID-HERE' and 'SEGURIDAD-UUID-HERE' with actual values
/*
INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
VALUES (
    'LOTE-UUID-HERE',
    'SEGURIDAD-UUID-HERE'
);
*/

-- Test 2: Try to assign non-seguridad user (should fail with trigger error)
/*
INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
VALUES (
    'LOTE-UUID-HERE',
    'ADMIN-OR-RRPP-UUID-HERE'  -- Should fail
);
*/

-- Test 3: Try to assign seguridad from different club (should fail)
/*
INSERT INTO public.lotes_seguridad (uuid_lote, id_seguridad)
VALUES (
    'LOTE-UUID-CLUB-A',
    'SEGURIDAD-UUID-CLUB-B'  -- Should fail
);
*/

-- ============================================
-- SECTION 4: Query Test Data
-- ============================================

-- View all assignments
SELECT * FROM public.lotes_seguridad;

-- View assignments with details (using view)
SELECT * FROM public.seguridad_lotes_asignados
ORDER BY evento_nombre, lote_nombre;

-- View assignments for specific lote
SELECT *
FROM public.seguridad_lotes_asignados
WHERE uuid_lote = 'LOTE-UUID-HERE';

-- View assignments for specific seguridad
SELECT *
FROM public.seguridad_lotes_asignados
WHERE id_seguridad = 'SEGURIDAD-UUID-HERE';

-- View assignments for specific evento
SELECT *
FROM public.seguridad_lotes_asignados
WHERE uuid_evento = 'EVENTO-UUID-HERE';

-- Count assignments by lote
SELECT
    l.nombre as lote,
    e.nombre as evento,
    COUNT(ls.id) as cantidad_seguridades
FROM public.lotes l
JOIN public.eventos e ON l.uuid_evento = e.id
LEFT JOIN public.lotes_seguridad ls ON l.id = ls.uuid_lote
WHERE l.activo = true
GROUP BY l.id, l.nombre, e.nombre
ORDER BY e.nombre, l.nombre;

-- Count assignments by seguridad
SELECT
    p.apellido || ', ' || p.nombre as seguridad,
    COUNT(ls.id) as cantidad_lotes
FROM public.personal p
LEFT JOIN public.lotes_seguridad ls ON p.id = ls.id_seguridad
WHERE p.rol = 'seguridad' AND p.activo = true
GROUP BY p.id, p.apellido, p.nombre
ORDER BY p.apellido, p.nombre;

-- ============================================
-- SECTION 5: Test RPC Functions
-- ============================================

-- IMPORTANT: These functions require authentication
-- Execute these while logged in as a seguridad user

-- Test get_my_assigned_lotes (run as seguridad)
/*
SELECT * FROM public.get_my_assigned_lotes();
*/

-- Test check_seguridad_can_scan (run as seguridad)
-- Replace 'QR-CODE-HERE' with actual QR code from invitados table
/*
SELECT public.check_seguridad_can_scan('QR-CODE-HERE');
*/

-- Test marcar_ingreso (run as seguridad)
/*
SELECT public.marcar_ingreso('QR-CODE-HERE');
*/

-- Test rechazar_invitado (run as seguridad)
/*
SELECT public.rechazar_invitado(
    'QR-CODE-HERE',
    'codigo_vestimenta'::razon_rechazo_type,
    NULL
);
*/

-- ============================================
-- SECTION 6: Test Error Cases
-- ============================================

-- Get QR codes for testing
SELECT
    i.qr_code,
    i.nombre,
    i.apellido,
    l.nombre as lote,
    e.nombre as evento
FROM public.invitados i
JOIN public.eventos e ON i.uuid_evento = e.id
LEFT JOIN public.lotes l ON i.uuid_lote = l.id
WHERE i.ingresado = false
  AND i.rechazado = false
LIMIT 10;

-- Test Case 1: Seguridad scans invitado from assigned lote
-- Expected: Success
/*
SELECT public.check_seguridad_can_scan('QR-CODE-FROM-ASSIGNED-LOTE');
*/

-- Test Case 2: Seguridad scans invitado from non-assigned lote
-- Expected: Error with lote name
/*
SELECT public.check_seguridad_can_scan('QR-CODE-FROM-OTHER-LOTE');
*/

-- Test Case 3: Seguridad scans invitado without lote
-- Expected: Success (backward compatibility)
/*
SELECT public.check_seguridad_can_scan('QR-CODE-WITHOUT-LOTE');
*/

-- ============================================
-- SECTION 7: Statistics & Reports
-- ============================================

-- Lotes with no assigned seguridad
SELECT
    l.id,
    l.nombre as lote,
    e.nombre as evento,
    l.cantidad_actual as invitados,
    COUNT(ls.id) as seguridades_asignados
FROM public.lotes l
JOIN public.eventos e ON l.uuid_evento = e.id
LEFT JOIN public.lotes_seguridad ls ON l.id = ls.uuid_lote
WHERE l.activo = true
  AND e.estado = true
GROUP BY l.id, l.nombre, e.nombre, l.cantidad_actual
HAVING COUNT(ls.id) = 0
ORDER BY l.cantidad_actual DESC;

-- Seguridad with no assigned lotes
SELECT
    p.id,
    p.apellido || ', ' || p.nombre as seguridad,
    c.nombre as club,
    COUNT(ls.id) as lotes_asignados
FROM public.personal p
JOIN public.clubs c ON p.uuid_club = c.id
LEFT JOIN public.lotes_seguridad ls ON p.id = ls.id_seguridad
WHERE p.rol = 'seguridad'
  AND p.activo = true
GROUP BY p.id, p.apellido, p.nombre, c.nombre
HAVING COUNT(ls.id) = 0
ORDER BY c.nombre, p.apellido;

-- Assignments summary by evento
SELECT
    e.nombre as evento,
    e.fecha,
    COUNT(DISTINCT l.id) as total_lotes,
    COUNT(DISTINCT ls.uuid_lote) as lotes_con_seguridad,
    COUNT(DISTINCT ls.id_seguridad) as total_seguridades,
    COUNT(ls.id) as total_asignaciones
FROM public.eventos e
JOIN public.lotes l ON l.uuid_evento = e.id
LEFT JOIN public.lotes_seguridad ls ON l.id = ls.uuid_lote
WHERE e.estado = true
  AND l.activo = true
GROUP BY e.id, e.nombre, e.fecha
ORDER BY e.fecha DESC;

-- Workload distribution (assignments per seguridad)
SELECT
    p.apellido || ', ' || p.nombre as seguridad,
    c.nombre as club,
    COUNT(DISTINCT ls.uuid_lote) as lotes_asignados,
    SUM(l.cantidad_actual) as total_invitados_bajo_cargo
FROM public.personal p
JOIN public.clubs c ON p.uuid_club = c.id
LEFT JOIN public.lotes_seguridad ls ON p.id = ls.id_seguridad
LEFT JOIN public.lotes l ON ls.uuid_lote = l.id
WHERE p.rol = 'seguridad'
  AND p.activo = true
GROUP BY p.id, p.apellido, p.nombre, c.nombre
ORDER BY lotes_asignados DESC, total_invitados_bajo_cargo DESC;

-- ============================================
-- SECTION 8: Update/Delete Test Assignments
-- ============================================

-- Delete specific assignment
/*
DELETE FROM public.lotes_seguridad
WHERE id = 'ASSIGNMENT-UUID-HERE';
*/

-- Delete all assignments for a lote
/*
DELETE FROM public.lotes_seguridad
WHERE uuid_lote = 'LOTE-UUID-HERE';
*/

-- Delete all assignments for a seguridad
/*
DELETE FROM public.lotes_seguridad
WHERE id_seguridad = 'SEGURIDAD-UUID-HERE';
*/

-- ============================================
-- SECTION 9: Performance Testing
-- ============================================

-- Check query performance for check_seguridad_can_scan
EXPLAIN ANALYZE
SELECT i.id, i.uuid_lote, e.uuid_club
FROM public.invitados i
JOIN public.eventos e ON i.uuid_evento = e.id
WHERE i.qr_code = 'SOME-QR-CODE';

-- Check query performance for assignment lookup
EXPLAIN ANALYZE
SELECT EXISTS (
    SELECT 1
    FROM public.lotes_seguridad ls
    WHERE ls.uuid_lote = 'SOME-LOTE-UUID'
    AND ls.id_seguridad = 'SOME-SEGURIDAD-UUID'
);

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'lotes_seguridad';

-- ============================================
-- SECTION 10: Cleanup (Use with caution!)
-- ============================================

-- Remove all test assignments (CAREFUL!)
/*
DELETE FROM public.lotes_seguridad
WHERE created_at > NOW() - INTERVAL '1 hour';
*/

-- Remove all assignments for inactive lotes
/*
DELETE FROM public.lotes_seguridad
WHERE uuid_lote IN (
    SELECT id FROM public.lotes WHERE activo = false
);
*/

-- Remove all assignments for inactive seguridad
/*
DELETE FROM public.lotes_seguridad
WHERE id_seguridad IN (
    SELECT id FROM public.personal WHERE rol = 'seguridad' AND activo = false
);
*/

-- ============================================
-- NOTES
-- ============================================

/*
Testing Checklist:

1. Installation Verification
   ✓ Table created with correct schema
   ✓ RLS enabled
   ✓ Policies created
   ✓ Functions created
   ✓ View created
   ✓ Triggers created

2. Basic Operations
   ✓ Insert assignment (admin only)
   ✓ View assignments
   ✓ Delete assignment (admin only)

3. Validations
   ✓ Cannot assign non-seguridad user
   ✓ Cannot assign seguridad from different club
   ✓ Cannot create duplicate assignment

4. RPC Functions
   ✓ get_my_assigned_lotes returns correct data
   ✓ check_seguridad_can_scan validates correctly
   ✓ marcar_ingreso works with validation
   ✓ rechazar_invitado works with validation

5. Error Cases
   ✓ Error message shows lote name when not assigned
   ✓ Backward compatibility for invitados without lote

6. Performance
   ✓ Queries use indexes efficiently
   ✓ No performance degradation on large tables
*/
