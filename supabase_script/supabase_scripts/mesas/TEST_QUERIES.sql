-- ============================================
-- TEST QUERIES - Sistema de Mesas
-- ============================================
-- Este archivo contiene queries de prueba para validar
-- el funcionamiento correcto del sistema de mesas.
-- NO ejecutar en producción sin revisar UUIDs y datos.
-- ============================================

-- ============================================
-- SECTION 1: Verificación de Instalación
-- ============================================

-- 1.1 Verificar que todas las tablas existen
SELECT 'Tabla sectores' as check_name, EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores'
) as exists;

SELECT 'Tabla mesas' as check_name, EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'mesas'
) as exists;

SELECT 'Tabla ventas_mesas' as check_name, EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_mesas'
) as exists;

SELECT 'Tabla escaneos_mesas' as check_name, EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'escaneos_mesas'
) as exists;

SELECT 'Tabla sectores_seguridad' as check_name, EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores_seguridad'
) as exists;

-- 1.2 Verificar enums
SELECT 'Enum estado_mesa_type' as check_name, EXISTS(
    SELECT 1 FROM pg_type WHERE typname = 'estado_mesa_type'
) as exists;

SELECT 'Enum tipo_escaneo_mesa' as check_name, EXISTS(
    SELECT 1 FROM pg_type WHERE typname = 'tipo_escaneo_mesa'
) as exists;

SELECT 'Enum bartender en user_role' as check_name, EXISTS(
    SELECT 1 FROM pg_enum WHERE enumlabel = 'bartender' AND enumtypid = 'user_role'::regtype
) as exists;

-- 1.3 Verificar RLS habilitado
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
ORDER BY tablename;

-- 1.4 Verificar funciones RPC existen
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'escanear_mesa_seguridad',
    'escanear_mesa_bartender',
    'reservar_mesa',
    'liberar_reserva_mesa',
    'vender_mesa',
    'get_my_assigned_sectores',
    'get_seguridad_by_sector',
    'assign_seguridad_to_sector',
    'get_mesa_escaneos_count'
)
ORDER BY routine_name;

-- 1.5 Verificar Realtime habilitado
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas')
ORDER BY tablename;

-- 1.6 Verificar storage bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'sectores-imagenes';

-- ============================================
-- SECTION 2: Datos de Prueba (Setup)
-- ============================================
-- NOTA: Reemplazar los UUIDs con datos reales de tu base de datos

-- 2.1 Variables de ejemplo (AJUSTAR según tu BD)
\set club_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''
\set evento_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''
\set admin_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''
\set rrpp_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''
\set seguridad_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''
\set bartender_uuid '\'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\''

/*
-- 2.2 Crear datos de prueba (ejecutar solo si es necesario)

-- Crear sector de prueba
INSERT INTO public.sectores (nombre, uuid_evento, uuid_club, imagen_url)
VALUES ('Sector TEST VIP', :evento_uuid, :club_uuid, 'https://example.com/sector-test.jpg')
RETURNING id;
-- Guardar el ID retornado como :sector_uuid

-- Crear mesa de prueba
INSERT INTO public.mesas (
    nombre, uuid_sector, uuid_evento, uuid_club,
    estado, precio, max_personas,
    comision_tipo, comision_rrpp_porcentaje,
    tiene_consumicion, monto_consumicion, detalle_consumicion,
    coordenada_x, coordenada_y
) VALUES (
    'Mesa TEST-1',
    :sector_uuid,
    :evento_uuid,
    :club_uuid,
    'libre',
    50000.00,
    6,
    'porcentaje',
    15.00,
    true,
    30000.00,
    '1 botella vodka Absolut + Red Bull + hielo',
    50.00,
    50.00
) RETURNING id;
-- Guardar el ID retornado como :mesa_uuid

-- Asignar seguridad al sector
INSERT INTO public.sectores_seguridad (uuid_sector, id_seguridad)
VALUES (:sector_uuid, :seguridad_uuid);
*/

-- ============================================
-- SECTION 3: Pruebas de Funciones RPC
-- ============================================

-- 3.1 Reservar Mesa (como RRPP)
/*
-- Cambiar SET LOCAL role si es necesario para simular usuario
SET LOCAL "request.jwt.claims" = '{"sub": "' || :rrpp_uuid || '"}';

SELECT public.reservar_mesa(:mesa_uuid);

-- Verificar estado cambió a reservado
SELECT nombre, estado, id_rrpp FROM public.mesas WHERE id = :mesa_uuid;
*/

-- 3.2 Liberar Reserva (como RRPP)
/*
SELECT public.liberar_reserva_mesa(:mesa_uuid);

-- Verificar estado volvió a libre
SELECT nombre, estado, id_rrpp FROM public.mesas WHERE id = :mesa_uuid;
*/

-- 3.3 Vender Mesa (como RRPP)
/*
SELECT public.vender_mesa(
    :mesa_uuid,
    '12345678'::TEXT,
    'Juan Pérez'::TEXT,
    'juan@example.com'::TEXT,
    50000.00::DECIMAL
);

-- Verificar venta creada
SELECT * FROM public.ventas_mesas WHERE uuid_mesa = :mesa_uuid;

-- Verificar mesa cambió a vendido
SELECT nombre, estado, id_rrpp FROM public.mesas WHERE id = :mesa_uuid;
*/

-- 3.4 Escanear Mesa Seguridad (solo verificar)
/*
-- Obtener QR code de la venta
SELECT qr_code FROM public.ventas_mesas WHERE uuid_mesa = :mesa_uuid;
-- Guardar como :qr_code

-- Simular seguridad
SET LOCAL "request.jwt.claims" = '{"sub": "' || :seguridad_uuid || '"}';

-- Solo verificar (no crea escaneo)
SELECT public.escanear_mesa_seguridad(:qr_code, true);

-- Marcar ingreso real
SELECT public.escanear_mesa_seguridad(:qr_code, false);

-- Verificar escaneo registrado
SELECT * FROM public.escaneos_mesas WHERE uuid_mesa = :mesa_uuid AND tipo_escaneo = 'seguridad';

-- Verificar contador incrementado
SELECT nombre, escaneos_seguridad_count, max_personas FROM public.mesas WHERE id = :mesa_uuid;
*/

-- 3.5 Escanear Mesa Bartender
/*
-- Simular bartender
SET LOCAL "request.jwt.claims" = '{"sub": "' || :bartender_uuid || '"}';

-- Ver detalle sin marcar entregado
SELECT public.escanear_mesa_bartender(:qr_code, false);

-- Marcar como entregado
SELECT public.escanear_mesa_bartender(:qr_code, true);

-- Verificar escaneo registrado
SELECT * FROM public.escaneos_mesas WHERE uuid_mesa = :mesa_uuid AND tipo_escaneo = 'bartender';

-- Verificar consumicion marcada
SELECT nombre, consumicion_entregada, id_bartender_entrega, fecha_entrega_consumicion
FROM public.mesas WHERE id = :mesa_uuid;

-- Intentar escanear de nuevo (debe fallar)
SELECT public.escanear_mesa_bartender(:qr_code, true);
-- Esperado: error "La consumicion ya fue entregada"
*/

-- ============================================
-- SECTION 4: Pruebas de Asignación Seguridad
-- ============================================

-- 4.1 Ver sectores asignados (como seguridad)
/*
SET LOCAL "request.jwt.claims" = '{"sub": "' || :seguridad_uuid || '"}';
SELECT * FROM public.get_my_assigned_sectores();
*/

-- 4.2 Ver seguridad asignados a un sector (como admin)
/*
SELECT * FROM public.get_seguridad_by_sector(:sector_uuid);
*/

-- 4.3 Asignar múltiples seguridad (como admin)
/*
SET LOCAL "request.jwt.claims" = '{"sub": "' || :admin_uuid || '"}';
SELECT public.assign_seguridad_to_sector(
    :sector_uuid,
    ARRAY[:seguridad_uuid, :otro_seguridad_uuid]::UUID[]
);
*/

-- 4.4 Ver vista de asignaciones
/*
SELECT * FROM public.seguridad_sectores_asignados
WHERE uuid_sector = :sector_uuid;
*/

-- ============================================
-- SECTION 5: Validaciones y Constraints
-- ============================================

-- 5.1 Intentar vender mesa sin comision configurada (debe fallar)
/*
-- Crear mesa sin comision
INSERT INTO public.mesas (
    nombre, uuid_sector, uuid_evento, uuid_club,
    estado, precio, max_personas, coordenada_x, coordenada_y
) VALUES (
    'Mesa SIN COMISION',
    :sector_uuid, :evento_uuid, :club_uuid,
    'libre', 10000, 4, 10.0, 10.0
) RETURNING id;
-- Guardar como :mesa_sin_comision_uuid

-- Intentar vender (debe fallar)
SELECT public.vender_mesa(:mesa_sin_comision_uuid, '99999999'::TEXT, NULL, NULL, NULL);
-- Esperado: error "La mesa no tiene comision configurada"
*/

-- 5.2 Intentar escanear mesa llena (debe fallar)
/*
-- Escanear hasta el límite
-- Si max_personas = 6, escanear 6 veces
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 1
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 2
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 3
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 4
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 5
SELECT public.escanear_mesa_seguridad(:qr_code, false); -- 6

-- Intentar escaneo 7 (debe fallar)
SELECT public.escanear_mesa_seguridad(:qr_code, false);
-- Esperado: error "Mesa completa: limite de X personas alcanzado"
*/

-- 5.3 Intentar cambiar estado a libre con venta activa (debe fallar)
/*
UPDATE public.mesas
SET estado = 'libre'
WHERE id = :mesa_uuid;
-- Esperado: error "No se puede cambiar el estado a libre: existe una venta activa"
*/

-- 5.4 Intentar eliminar venta con escaneos (debe fallar)
/*
DELETE FROM public.ventas_mesas WHERE uuid_mesa = :mesa_uuid;
-- Esperado: error "No se puede eliminar una venta de mesa que tiene escaneos registrados"
*/

-- 5.5 Verificar mesa libre no puede tener RRPP
/*
UPDATE public.mesas
SET id_rrpp = :rrpp_uuid
WHERE id = :mesa_uuid AND estado = 'libre';
-- Esperado: error "Una mesa libre no puede tener RRPP asignado"
*/

-- ============================================
-- SECTION 6: Reportes y Analytics
-- ============================================

-- 6.1 Conteo de mesas por estado
SELECT estado, COUNT(*) as cantidad
FROM public.mesas
WHERE uuid_evento = :evento_uuid
GROUP BY estado;

-- 6.2 Mesas con mayor ocupación
SELECT
    m.nombre,
    m.escaneos_seguridad_count,
    m.max_personas,
    ROUND((m.escaneos_seguridad_count::DECIMAL / m.max_personas) * 100, 2) as porcentaje_ocupacion
FROM public.mesas m
WHERE m.uuid_evento = :evento_uuid
AND m.estado = 'vendido'
ORDER BY porcentaje_ocupacion DESC;

-- 6.3 Consumiciones entregadas vs pendientes
SELECT
    COUNT(*) FILTER (WHERE consumicion_entregada = true) as entregadas,
    COUNT(*) FILTER (WHERE consumicion_entregada = false) as pendientes,
    COUNT(*) as total
FROM public.mesas
WHERE uuid_evento = :evento_uuid
AND estado = 'vendido'
AND tiene_consumicion = true;

-- 6.4 Ventas por RRPP con comisiones
SELECT
    p.nombre || ' ' || p.apellido as rrpp_nombre,
    COUNT(vm.id) as cantidad_ventas,
    SUM(vm.precio_venta) as total_vendido,
    SUM(vm.comision_calculada) as total_comision
FROM public.ventas_mesas vm
JOIN public.personal p ON vm.id_rrpp = p.id
WHERE vm.uuid_evento = :evento_uuid
GROUP BY p.id, p.nombre, p.apellido
ORDER BY total_comision DESC;

-- 6.5 Historial de escaneos por personal
SELECT
    em.tipo_escaneo,
    em.nombre_personal,
    em.rol_personal,
    COUNT(*) as cantidad_escaneos,
    MIN(em.created_at) as primer_escaneo,
    MAX(em.created_at) as ultimo_escaneo
FROM public.escaneos_mesas em
JOIN public.ventas_mesas vm ON em.uuid_venta_mesa = vm.id
WHERE vm.uuid_evento = :evento_uuid
GROUP BY em.tipo_escaneo, em.nombre_personal, em.rol_personal
ORDER BY cantidad_escaneos DESC;

-- 6.6 Sectores con más mesas vendidas
SELECT
    s.nombre as sector_nombre,
    COUNT(m.id) FILTER (WHERE m.estado = 'libre') as mesas_libres,
    COUNT(m.id) FILTER (WHERE m.estado = 'reservado') as mesas_reservadas,
    COUNT(m.id) FILTER (WHERE m.estado = 'vendido') as mesas_vendidas,
    COUNT(m.id) as total_mesas
FROM public.sectores s
LEFT JOIN public.mesas m ON s.id = m.uuid_sector
WHERE s.uuid_evento = :evento_uuid
GROUP BY s.id, s.nombre
ORDER BY mesas_vendidas DESC;

-- 6.7 Mesas con coordenadas para renderizado visual
SELECT
    m.id,
    m.nombre,
    m.estado,
    m.coordenada_x,
    m.coordenada_y,
    m.escaneos_seguridad_count,
    m.max_personas,
    p.nombre || ' ' || p.apellido as rrpp_nombre
FROM public.mesas m
LEFT JOIN public.personal p ON m.id_rrpp = p.id
WHERE m.uuid_sector = :sector_uuid
AND m.activo = true
ORDER BY m.nombre;

-- ============================================
-- SECTION 7: Cleanup (opcional)
-- ============================================

/*
-- ADVERTENCIA: Esto eliminará todos los datos de prueba
-- Solo ejecutar en entorno de desarrollo

-- Eliminar escaneos
DELETE FROM public.escaneos_mesas WHERE uuid_mesa = :mesa_uuid;

-- Eliminar ventas
DELETE FROM public.ventas_mesas WHERE uuid_mesa = :mesa_uuid;

-- Eliminar asignaciones seguridad
DELETE FROM public.sectores_seguridad WHERE uuid_sector = :sector_uuid;

-- Eliminar mesas
DELETE FROM public.mesas WHERE uuid_sector = :sector_uuid;

-- Eliminar sector
DELETE FROM public.sectores WHERE id = :sector_uuid;
*/

-- ============================================
-- SECTION 8: Performance Checks
-- ============================================

-- 8.1 Verificar índices existen
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
ORDER BY tablename, indexname;

-- 8.2 Estadísticas de tablas
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
ORDER BY tablename;

-- 8.3 Tamaño de tablas
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('sectores', 'mesas', 'ventas_mesas', 'escaneos_mesas', 'sectores_seguridad')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- FIN DE TEST QUERIES
-- ============================================

-- Para ejecutar todas las verificaciones básicas de una vez:
DO $$
DECLARE
    v_sectores_exists BOOLEAN;
    v_mesas_exists BOOLEAN;
    v_ventas_exists BOOLEAN;
    v_escaneos_exists BOOLEAN;
    v_sectores_seg_exists BOOLEAN;
    v_bartender_exists BOOLEAN;
BEGIN
    -- Check tables
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores') INTO v_sectores_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'mesas') INTO v_mesas_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_mesas') INTO v_ventas_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'escaneos_mesas') INTO v_escaneos_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores_seguridad') INTO v_sectores_seg_exists;

    -- Check enum
    SELECT EXISTS(SELECT 1 FROM pg_enum WHERE enumlabel = 'bartender' AND enumtypid = 'user_role'::regtype) INTO v_bartender_exists;

    -- Results
    IF v_sectores_exists AND v_mesas_exists AND v_ventas_exists AND v_escaneos_exists AND v_sectores_seg_exists AND v_bartender_exists THEN
        RAISE NOTICE '✅ TODAS LAS VERIFICACIONES PASARON - Sistema de Mesas instalado correctamente';
    ELSE
        RAISE WARNING '⚠ FALTAN COMPONENTES:';
        IF NOT v_sectores_exists THEN RAISE WARNING '  - Tabla sectores'; END IF;
        IF NOT v_mesas_exists THEN RAISE WARNING '  - Tabla mesas'; END IF;
        IF NOT v_ventas_exists THEN RAISE WARNING '  - Tabla ventas_mesas'; END IF;
        IF NOT v_escaneos_exists THEN RAISE WARNING '  - Tabla escaneos_mesas'; END IF;
        IF NOT v_sectores_seg_exists THEN RAISE WARNING '  - Tabla sectores_seguridad'; END IF;
        IF NOT v_bartender_exists THEN RAISE WARNING '  - Enum bartender'; END IF;
    END IF;
END $$;
