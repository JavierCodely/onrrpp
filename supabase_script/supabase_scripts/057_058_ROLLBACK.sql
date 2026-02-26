-- =============================================
-- ROLLBACK for Migrations 057-058
-- Lotes-Seguridad Assignment System
-- =============================================
-- Description: This script reverts all changes made by migrations 057 and 058
-- IMPORTANT: Execute this script ONLY if you need to completely remove the
--            lotes-seguridad assignment system. This will delete ALL assignments.
-- =============================================

-- ============================================
-- WARNING: This is a destructive operation!
-- ============================================
-- This script will:
-- 1. Drop the new functions (marcar_ingreso, get_my_assigned_lotes, check_seguridad_can_scan)
-- 2. Drop the view (seguridad_lotes_asignados)
-- 3. Restore the original rechazar_invitado function
-- 4. Drop all triggers and validation functions
-- 5. Drop the lotes_seguridad table (deletes all assignments)
--
-- Make sure you have a backup before proceeding!
-- ============================================

-- Confirmation prompt (uncomment to enable)
-- DO $$
-- BEGIN
--     RAISE EXCEPTION 'ROLLBACK CONFIRMATION REQUIRED: This will delete all lote-seguridad assignments. Comment this block to proceed.';
-- END $$;

-- ============================================
-- SECTION 1: Drop Functions from Migration 058
-- ============================================

-- Drop marcar_ingreso function
DROP FUNCTION IF EXISTS public.marcar_ingreso(TEXT);
COMMENT ON FUNCTION public.marcar_ingreso IS 'DROPPED - Rolled back migration 058';

-- Drop get_my_assigned_lotes function
DROP FUNCTION IF EXISTS public.get_my_assigned_lotes();
COMMENT ON FUNCTION public.get_my_assigned_lotes IS 'DROPPED - Rolled back migration 058';

-- Drop view
DROP VIEW IF EXISTS public.seguridad_lotes_asignados;
-- Note: View comments are dropped with the view

-- ============================================
-- SECTION 2: Restore Original rechazar_invitado Function
-- ============================================

-- Restore the original version from migration 047 (without lote validation)
CREATE OR REPLACE FUNCTION public.rechazar_invitado(
    p_qr_code TEXT,
    p_razon razon_rechazo_type,
    p_detalle TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitado_id UUID;
    v_user_id UUID;
    v_user_role user_role;
    v_invitado_club UUID;
    v_user_club UUID;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    -- Get user role and club
    SELECT rol, uuid_club INTO v_user_role, v_user_club
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'seguridad' THEN
        RETURN json_build_object('success', false, 'error', 'Solo seguridad puede rechazar invitados');
    END IF;

    -- Find invitado by QR code
    SELECT i.id, e.uuid_club INTO v_invitado_id, v_invitado_club
    FROM public.invitados i
    JOIN public.eventos e ON i.uuid_evento = e.id
    WHERE i.qr_code = p_qr_code;

    IF v_invitado_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invitado no encontrado');
    END IF;

    -- Check club match
    IF v_invitado_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este invitado');
    END IF;

    -- Update invitado as rejected (NO LOTE VALIDATION)
    UPDATE public.invitados
    SET
        rechazado = true,
        razon_rechazo = p_razon,
        razon_rechazo_detalle = CASE WHEN p_razon = 'otro' THEN p_detalle ELSE NULL END,
        fecha_rechazo = NOW(),
        id_seguridad_rechazo = v_user_id,
        updated_at = NOW()
    WHERE id = v_invitado_id;

    RETURN json_build_object('success', true, 'invitado_id', v_invitado_id);
END;
$$;

COMMENT ON FUNCTION public.rechazar_invitado IS 'RESTORED - Original version from migration 047 (no lote validation)';

-- ============================================
-- SECTION 3: Drop Functions from Migration 057
-- ============================================

-- Drop check_seguridad_can_scan function
DROP FUNCTION IF EXISTS public.check_seguridad_can_scan(TEXT);
-- Note: Function comments are dropped with the function

-- ============================================
-- SECTION 4: Drop Triggers and Validation Functions
-- ============================================

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_validate_lotes_seguridad_role ON public.lotes_seguridad;

-- Drop trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_lotes_seguridad_updated_at ON public.lotes_seguridad;

-- Drop validation function
DROP FUNCTION IF EXISTS public.validate_lotes_seguridad_role();

-- ============================================
-- SECTION 5: Drop Table lotes_seguridad
-- ============================================

-- WARNING: This will delete all assignments!
-- This will also remove all RLS policies automatically
DROP TABLE IF EXISTS public.lotes_seguridad CASCADE;

-- ============================================
-- SECTION 6: Verification Queries
-- ============================================

-- Verify that everything was dropped successfully

-- Check table does not exist
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_name = 'lotes_seguridad';
-- Expected: 0

-- Check functions were dropped/restored
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_seguridad_can_scan',      -- Should NOT exist
    'marcar_ingreso',                -- Should NOT exist
    'get_my_assigned_lotes',         -- Should NOT exist
    'validate_lotes_seguridad_role', -- Should NOT exist
    'rechazar_invitado'              -- Should exist (restored version)
)
ORDER BY routine_name;
-- Expected: Only 'rechazar_invitado' should be present

-- Check view does not exist
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_name = 'seguridad_lotes_asignados';
-- Expected: 0

-- Check triggers were dropped
SELECT COUNT(*) as trigger_exists
FROM information_schema.triggers
WHERE event_object_table = 'lotes_seguridad';
-- Expected: 0

-- Check RLS policies were dropped (table doesn't exist)
SELECT COUNT(*) as policy_exists
FROM pg_policies
WHERE tablename = 'lotes_seguridad';
-- Expected: 0

-- ============================================
-- SECTION 7: Post-Rollback Actions (Manual)
-- ============================================

/*
After executing this rollback script, you should:

1. Update Frontend Code:
   - Remove calls to marcar_ingreso() and use direct UPDATE again
   - Remove calls to check_seguridad_can_scan()
   - Remove calls to get_my_assigned_lotes()
   - Remove LoteSeguridadManager component
   - Remove MyAssignedLotes component
   - Restore original ScannerPage implementation

2. Update Services:
   - Remove or comment out src/services/lotes-seguridad.service.ts
   - Restore original scanner service implementation

3. Database Cleanup:
   - No additional cleanup needed (CASCADE handles foreign keys)

4. Documentation:
   - Mark migrations 057-058 as rolled back in your migration log
   - Update your database schema documentation

5. Inform Team:
   - Notify all developers that lote-seguridad assignments are removed
   - Update any feature flags or configuration
   - Inform seguridad staff that any lote restrictions are removed
*/

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================

-- Log the rollback
DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK COMPLETE: Migrations 057-058 have been reverted.';
    RAISE NOTICE 'Table lotes_seguridad dropped.';
    RAISE NOTICE 'All functions from 058 dropped.';
    RAISE NOTICE 'Function rechazar_invitado restored to original version.';
    RAISE NOTICE 'Function check_seguridad_can_scan dropped.';
    RAISE NOTICE 'View seguridad_lotes_asignados dropped.';
    RAISE NOTICE 'All triggers and validation functions dropped.';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: You must now update your frontend code!';
    RAISE NOTICE 'See SECTION 7 above for post-rollback manual actions.';
END $$;

-- ============================================
-- Troubleshooting
-- ============================================

/*
If you encounter errors during rollback:

ERROR: function X does not exist
  → SAFE TO IGNORE - Function was already dropped

ERROR: table X does not exist
  → SAFE TO IGNORE - Table was already dropped

ERROR: view X does not exist
  → SAFE TO IGNORE - View was already dropped

ERROR: cannot drop function rechazar_invitado because other objects depend on it
  → Check for grants or dependent views
  → Drop dependent objects first or use CASCADE

ERROR: permission denied
  → Make sure you're executing as a superuser or the table owner
  → Check your Supabase project permissions

For partial rollbacks (rollback only 058 but keep 057):
  → Comment out SECTION 3, 4, 5 (keep lotes_seguridad table)
  → This will restore original functions but keep assignment table
  → Useful if you want to keep assignment data but remove validation

For debugging:
  → Use queries in SECTION 6 to verify what was dropped
  → Check information_schema tables to confirm state
  → Review Supabase logs for any errors
*/
