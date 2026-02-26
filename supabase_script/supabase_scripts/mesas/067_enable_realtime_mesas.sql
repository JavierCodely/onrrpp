-- Migration: 067 - Enable Realtime for Mesas Tables
-- Description: Enable Supabase Realtime subscriptions for live updates on mesas, sectores, ventas, and escaneos
-- Dependencies: 062_create_sectores_table.sql, 063_create_mesas_table.sql, 064_create_mesas_ventas.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Enable Realtime on Tables
-- ============================================

-- Add sectores to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sectores;

-- Add mesas to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;

-- Add ventas_mesas to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas_mesas;

-- Add escaneos_mesas to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.escaneos_mesas;

-- ============================================
-- SECTION 2: Configure Replica Identity
-- ============================================

-- Set replica identity to FULL for better realtime tracking
-- This allows tracking changes to all columns, not just primary key

ALTER TABLE public.sectores REPLICA IDENTITY FULL;
ALTER TABLE public.mesas REPLICA IDENTITY FULL;
ALTER TABLE public.ventas_mesas REPLICA IDENTITY FULL;
ALTER TABLE public.escaneos_mesas REPLICA IDENTITY FULL;

-- ============================================
-- SECTION 3: Documentation and Usage Examples
-- ============================================

/*
REALTIME USAGE EXAMPLES FOR FRONTEND:

1. ADMIN - Listen to mesas changes for a specific evento:
   ```typescript
   const channel = supabase
     .channel('mesas-changes')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'mesas',
       filter: `uuid_evento=eq.${eventoId}`
     }, (payload) => {
       console.log('Mesa changed:', payload)
       // Update local state
     })
     .subscribe()
   ```

2. RRPP - Listen to their own mesas reservadas/vendidas:
   ```typescript
   const channel = supabase
     .channel('my-mesas')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'mesas',
       filter: `id_rrpp=eq.${userId}`
     }, (payload) => {
       console.log('My mesa changed:', payload)
     })
     .subscribe()
   ```

3. SEGURIDAD - Listen to escaneos in real-time:
   ```typescript
   const channel = supabase
     .channel('escaneos-seguridad')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'escaneos_mesas',
       filter: `tipo_escaneo=eq.seguridad`
     }, (payload) => {
       console.log('New security scan:', payload)
     })
     .subscribe()
   ```

4. BARTENDER - Listen to consumicion delivery status:
   ```typescript
   const channel = supabase
     .channel('mesas-consumiciones')
     .on('postgres_changes', {
       event: 'UPDATE',
       schema: 'public',
       table: 'mesas',
       filter: `tiene_consumicion=eq.true`
     }, (payload) => {
       if (payload.new.consumicion_entregada && !payload.old.consumicion_entregada) {
         console.log('Consumicion delivered:', payload.new)
       }
     })
     .subscribe()
   ```

5. ALL USERS - Listen to mesa estado changes (libre/reservado/vendido):
   ```typescript
   const channel = supabase
     .channel('mesas-estado')
     .on('postgres_changes', {
       event: 'UPDATE',
       schema: 'public',
       table: 'mesas'
     }, (payload) => {
       if (payload.old.estado !== payload.new.estado) {
         console.log('Mesa estado changed:', {
           mesa: payload.new.nombre,
           from: payload.old.estado,
           to: payload.new.estado
         })
         // Update visual representation (color circles)
       }
     })
     .subscribe()
   ```

6. VISUAL MAP - Listen to all sectores and mesas for a visual layout:
   ```typescript
   // Subscribe to multiple tables at once
   const channel = supabase
     .channel('sector-map')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'sectores',
       filter: `uuid_evento=eq.${eventoId}`
     }, handleSectorChange)
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'mesas',
       filter: `uuid_evento=eq.${eventoId}`
     }, handleMesaChange)
     .subscribe()
   ```

7. VENTAS TRACKING - Listen to new ventas for commission updates:
   ```typescript
   const channel = supabase
     .channel('ventas-mesas-rrpp')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'ventas_mesas',
       filter: `id_rrpp=eq.${userId}`
     }, (payload) => {
       console.log('New venta:', payload.new)
       // Update comisiones total
       updateComisionesTotal(payload.new.comision_calculada)
     })
     .subscribe()
   ```

IMPORTANT NOTES:
- Always unsubscribe when component unmounts: channel.unsubscribe()
- Use specific filters to reduce unnecessary traffic
- RLS policies still apply to realtime subscriptions
- Changes are only broadcasted if user has SELECT permission
*/

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_sectores_realtime BOOLEAN;
    v_mesas_realtime BOOLEAN;
    v_ventas_realtime BOOLEAN;
    v_escaneos_realtime BOOLEAN;
BEGIN
    -- Check if tables are in realtime publication
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'sectores'
    ) INTO v_sectores_realtime;

    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'mesas'
    ) INTO v_mesas_realtime;

    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'ventas_mesas'
    ) INTO v_ventas_realtime;

    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'escaneos_mesas'
    ) INTO v_escaneos_realtime;

    IF v_sectores_realtime THEN
        RAISE NOTICE '✅ Realtime enabled on sectores';
    ELSE
        RAISE WARNING '⚠ Realtime NOT enabled on sectores';
    END IF;

    IF v_mesas_realtime THEN
        RAISE NOTICE '✅ Realtime enabled on mesas';
    ELSE
        RAISE WARNING '⚠ Realtime NOT enabled on mesas';
    END IF;

    IF v_ventas_realtime THEN
        RAISE NOTICE '✅ Realtime enabled on ventas_mesas';
    ELSE
        RAISE WARNING '⚠ Realtime NOT enabled on ventas_mesas';
    END IF;

    IF v_escaneos_realtime THEN
        RAISE NOTICE '✅ Realtime enabled on escaneos_mesas';
    ELSE
        RAISE WARNING '⚠ Realtime NOT enabled on escaneos_mesas';
    END IF;

    IF v_sectores_realtime AND v_mesas_realtime AND v_ventas_realtime AND v_escaneos_realtime THEN
        RAISE NOTICE '✅ Migration 067 completed successfully - All tables have realtime enabled';
    ELSE
        RAISE EXCEPTION '❌ Migration 067 failed - Not all tables have realtime enabled';
    END IF;
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Remove tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.sectores;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mesas;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ventas_mesas;
ALTER PUBLICATION supabase_realtime DROP TABLE public.escaneos_mesas;

-- Reset replica identity to default
ALTER TABLE public.sectores REPLICA IDENTITY DEFAULT;
ALTER TABLE public.mesas REPLICA IDENTITY DEFAULT;
ALTER TABLE public.ventas_mesas REPLICA IDENTITY DEFAULT;
ALTER TABLE public.escaneos_mesas REPLICA IDENTITY DEFAULT;
*/
