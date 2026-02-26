-- =============================================
-- MASTER MIGRATION SCRIPT
-- =============================================
-- Este script ejecuta TODAS las migraciones en orden.
--
-- ⚠️  IMPORTANTE:
-- - Hacer BACKUP de la base de datos antes de ejecutar
-- - Revisar cada migración individualmente si ya tienes datos
-- - Este script está diseñado para una instalación LIMPIA
--
-- ALTERNATIVA RECOMENDADA:
-- Ejecutar cada script individualmente en el SQL Editor de Supabase
-- siguiendo el orden del README.md
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE '🚀 INICIANDO MIGRACIONES COMPLETAS';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total de migraciones: 41';
    RAISE NOTICE 'Este proceso puede tardar varios minutos...';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ADVERTENCIA:';
    RAISE NOTICE 'Si ya tienes datos en tu base de datos,';
    RAISE NOTICE 'NO ejecutes este script.';
    RAISE NOTICE 'En su lugar, ejecuta cada migración individualmente.';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;

-- =============================================
-- INSTRUCCIONES DE USO
-- =============================================
--
-- OPCIÓN 1: Ejecutar todas las migraciones de una vez (NO RECOMENDADO)
-- 1. Copiar TODOS los archivos SQL del directorio supabase_scripts/
-- 2. Pegarlos aquí en orden numérico (001, 002, 003, ...)
-- 3. Ejecutar este script completo
--
-- OPCIÓN 2: Ejecutar migraciones individualmente (RECOMENDADO)
-- 1. Abrir Supabase Dashboard → SQL Editor
-- 2. Ejecutar cada script en orden numérico:
--    - 001_create_enums.sql
--    - 002_create_clubs.sql
--    - 003_create_personal.sql
--    - ... (continuar hasta 041)
-- 3. Verificar que cada script se ejecute sin errores
--
-- =============================================
-- NOTA FINAL
-- =============================================
--
-- Este archivo RUN_ALL.sql es solo un PLACEHOLDER.
--
-- La forma CORRECTA de ejecutar las migraciones es:
-- 1. Leer README.md en este directorio
-- 2. Ejecutar cada script UNO POR UNO en orden numérico
-- 3. Verificar el resultado de cada migración antes de continuar
--
-- Si intentas concatenar todos los scripts aquí,
-- el archivo será demasiado grande y puede causar problemas.
--
-- =============================================

-- Para ejecutar todas las migraciones, sigue estos pasos:
--
-- EN WINDOWS (Git Bash o WSL):
-- cd supabase_scripts
-- cat 0*.sql | clip  # Copia todo al portapapeles
--
-- EN LINUX/MAC:
-- cd supabase_scripts
-- cat 0*.sql | pbcopy  # En Mac
-- cat 0*.sql | xclip -selection clipboard  # En Linux
--
-- Luego pega en el SQL Editor de Supabase y ejecuta.
--
-- ⚠️  SOLO PARA INSTALACIONES LIMPIAS
-- ⚠️  HACER BACKUP ANTES DE EJECUTAR

-- Script de verificación final
DO $$
DECLARE
    v_tablas INTEGER;
    v_vistas INTEGER;
    v_funciones INTEGER;
    v_triggers INTEGER;
    v_policies INTEGER;
BEGIN
    -- Contar tablas
    SELECT COUNT(*)
    INTO v_tablas
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';

    -- Contar vistas
    SELECT COUNT(*)
    INTO v_vistas
    FROM information_schema.views
    WHERE table_schema = 'public';

    -- Contar funciones
    SELECT COUNT(*)
    INTO v_funciones
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';

    -- Contar triggers
    SELECT COUNT(*)
    INTO v_triggers
    FROM information_schema.triggers
    WHERE event_object_schema = 'public';

    -- Contar políticas RLS
    SELECT COUNT(*)
    INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ VERIFICACIÓN FINAL';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tablas creadas: %', v_tablas;
    RAISE NOTICE 'Vistas creadas: %', v_vistas;
    RAISE NOTICE 'Funciones creadas: %', v_funciones;
    RAISE NOTICE 'Triggers creados: %', v_triggers;
    RAISE NOTICE 'Políticas RLS: %', v_policies;
    RAISE NOTICE '';

    IF v_tablas >= 8 AND v_vistas >= 2 THEN
        RAISE NOTICE '✅ INSTALACIÓN COMPLETA EXITOSA';
    ELSE
        RAISE WARNING '⚠️  Algunos objetos pueden estar faltando';
        RAISE NOTICE 'Verifica el README.md para más información';
    END IF;

    RAISE NOTICE '==============================================';
END $$;
