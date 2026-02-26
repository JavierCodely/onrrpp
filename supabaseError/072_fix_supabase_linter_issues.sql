-- Migration: 072_fix_supabase_linter_issues.sql
-- Description: Fixes all Supabase linter security issues
--   1. Recreate ventas_mesas_decrypted view with security_invoker = true
--   2. Set search_path = public on all functions
--   3. Replace overly permissive RLS policy on clientes_ingresos_por_club
-- Date: 2026-01-31

-- ============================================
-- ISSUE 1: Security Definer View
-- ============================================
DROP VIEW IF EXISTS public.ventas_mesas_decrypted;

CREATE VIEW public.ventas_mesas_decrypted
WITH (security_invoker = true)
AS
SELECT
    id,
    uuid_mesa,
    uuid_evento,
    uuid_club,
    id_rrpp,
    decrypt_dni(cliente_dni) AS cliente_dni,
    cliente_nombre,
    cliente_email,
    precio_venta,
    comision_tipo,
    comision_rrpp_monto,
    comision_rrpp_porcentaje,
    comision_calculada,
    qr_code,
    created_at,
    updated_at
FROM public.ventas_mesas;

GRANT SELECT ON public.ventas_mesas_decrypted TO authenticated;

-- ============================================
-- ISSUE 2: Function Search Path Mutable
-- ============================================
-- Correct signatures verified from source SQL files.

-- Core RLS/Auth (no params or simple params)
ALTER FUNCTION public.get_current_user_club() SET search_path = public;
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.check_user_has_role(user_role) SET search_path = public;
ALTER FUNCTION public.user_belongs_to_club(uuid) SET search_path = public;

-- Validation trigger functions (no params, return TRIGGER)
ALTER FUNCTION public.validate_admin_creates_evento() SET search_path = public;
ALTER FUNCTION public.validate_rrpp_creates_invitado() SET search_path = public;
ALTER FUNCTION public.validate_venta_montos() SET search_path = public;
ALTER FUNCTION public.validate_personal_grupo() SET search_path = public;
ALTER FUNCTION public.validate_lotes_seguridad_role() SET search_path = public;
ALTER FUNCTION public.validate_sectores_seguridad_role() SET search_path = public;
ALTER FUNCTION public.validate_mesa_state() SET search_path = public;
ALTER FUNCTION public.validate_venta_mesa() SET search_path = public;
ALTER FUNCTION public.validate_escaneo_mesa() SET search_path = public;

-- Trigger functions - Invitados (no params)
ALTER FUNCTION public.increment_total_invitados() SET search_path = public;
ALTER FUNCTION public.decrement_total_invitados() SET search_path = public;
ALTER FUNCTION public.update_total_ingresados() SET search_path = public;
ALTER FUNCTION public.handle_delete_ingresado() SET search_path = public;
ALTER FUNCTION public.prevent_delete_ingresados() SET search_path = public;
ALTER FUNCTION public.auto_set_fecha_ingreso() SET search_path = public;
ALTER FUNCTION public.set_invitado_qr_code() SET search_path = public;
ALTER FUNCTION public.handle_dni_change_on_update() SET search_path = public;

-- Trigger functions - Clientes (no params)
ALTER FUNCTION public.auto_create_or_find_cliente() SET search_path = public;
ALTER FUNCTION public.sync_cliente_data_on_invitado_update() SET search_path = public;
ALTER FUNCTION public.validar_cliente_lote_unico() SET search_path = public;
ALTER FUNCTION public.incrementar_ingresos_cliente_por_club() SET search_path = public;
ALTER FUNCTION public.decrementar_ingresos_cliente_on_delete() SET search_path = public;
ALTER FUNCTION public.trigger_populate_dni_hash_clientes() SET search_path = public, extensions;
ALTER FUNCTION public.trigger_populate_dni_hash_invitados() SET search_path = public, extensions;

-- Trigger functions - Mesas (no params)
ALTER FUNCTION public.update_mesa_on_venta_created() SET search_path = public;
ALTER FUNCTION public.prevent_venta_mesa_deletion_with_scans() SET search_path = public;
ALTER FUNCTION public.reset_mesa_on_venta_deleted() SET search_path = public;
ALTER FUNCTION public.prevent_estado_change_with_venta() SET search_path = public;
ALTER FUNCTION public.increment_escaneos_seguridad() SET search_path = public;
ALTER FUNCTION public.prevent_duplicate_bartender_scan() SET search_path = public;

-- Trigger functions - General (no params)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.decrement_lote_cantidad() SET search_path = public;
ALTER FUNCTION public.calculate_edad_from_fecha_nacimiento() SET search_path = public;
ALTER FUNCTION public.generate_unique_qr_code() SET search_path = public;

-- RPC - Invitados
ALTER FUNCTION public.marcar_ingreso(text, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.rechazar_invitado(text, razon_rechazo_type, text) SET search_path = public;
ALTER FUNCTION public.check_cliente_denegado(text) SET search_path = public;
ALTER FUNCTION public.get_invitado_scan_info(text) SET search_path = public;
ALTER FUNCTION public.mark_invitado_ingresado(uuid) SET search_path = public;

-- RPC - Mesas
ALTER FUNCTION public.reservar_mesa(uuid) SET search_path = public;
ALTER FUNCTION public.liberar_reserva_mesa(uuid) SET search_path = public;
ALTER FUNCTION public.vender_mesa(uuid, text, text, text, decimal) SET search_path = public, extensions;
ALTER FUNCTION public.escanear_mesa_seguridad(text, boolean) SET search_path = public, extensions;
ALTER FUNCTION public.escanear_mesa_bartender(text, boolean) SET search_path = public, extensions;
ALTER FUNCTION public.get_mesa_escaneos_count(uuid, tipo_escaneo_mesa) SET search_path = public;

-- RPC - Security Assignment
ALTER FUNCTION public.get_my_assigned_lotes() SET search_path = public;
ALTER FUNCTION public.check_seguridad_can_scan(text) SET search_path = public;
ALTER FUNCTION public.get_my_assigned_sectores() SET search_path = public;
ALTER FUNCTION public.get_seguridad_by_sector(uuid) SET search_path = public;
ALTER FUNCTION public.assign_seguridad_to_sector(uuid, uuid[]) SET search_path = public;

-- RPC - Auth
ALTER FUNCTION public.log_auth_attempt(uuid, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_failed_login_attempts(text, integer) SET search_path = public;
ALTER FUNCTION public.cleanup_old_auth_logs() SET search_path = public;

-- Utility
ALTER FUNCTION public.get_evento_club(uuid) SET search_path = public;

-- Encryption (need extensions schema for pgcrypto)
ALTER FUNCTION public.get_encryption_key() SET search_path = public, extensions;
ALTER FUNCTION public.encrypt_dni(text) SET search_path = public, extensions;
ALTER FUNCTION public.decrypt_dni(text) SET search_path = public, extensions;
ALTER FUNCTION public.hash_dni(text) SET search_path = public, extensions;

-- ============================================
-- ISSUE 3: RLS Policy Always True
-- ============================================
DROP POLICY IF EXISTS "System can manage ingresos" ON public.clientes_ingresos_por_club;

COMMENT ON TABLE public.clientes_ingresos_por_club IS
'Tracks client entry count per club. Managed by SECURITY DEFINER triggers. Users can only SELECT their club data via RLS.';

-- ============================================
-- ISSUE 4: Leaked Password Protection
-- ============================================
-- This is a Dashboard setting, NOT SQL.
-- Go to: Supabase Dashboard > Authentication > Settings > Password Protection
-- Enable "Leaked Password Protection"
