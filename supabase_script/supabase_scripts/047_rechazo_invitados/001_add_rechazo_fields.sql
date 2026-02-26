-- =============================================
-- Migration: 047 - Add Rechazo Fields to Invitados
-- Description: Add rejection tracking fields for security personnel
-- Dependencies: 005_create_invitados.sql
-- =============================================

-- Create enum for rejection reasons
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'razon_rechazo_type') THEN
        CREATE TYPE razon_rechazo_type AS ENUM (
            'codigo_vestimenta',
            'comportamiento_inadecuado',
            'otro'
        );
    END IF;
END $$;

-- Add rejection fields to invitados table
ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS rechazado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS razon_rechazo razon_rechazo_type;

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS razon_rechazo_detalle TEXT;

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMPTZ;

ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS id_seguridad_rechazo UUID REFERENCES public.personal(id);

-- Create index for rejected invitados
CREATE INDEX IF NOT EXISTS idx_invitados_rechazado ON public.invitados(rechazado);
CREATE INDEX IF NOT EXISTS idx_invitados_evento_rechazado ON public.invitados(uuid_evento, rechazado);

-- Add comments
COMMENT ON COLUMN public.invitados.rechazado IS 'Si el invitado fue rechazado por seguridad';
COMMENT ON COLUMN public.invitados.razon_rechazo IS 'Razon del rechazo (codigo_vestimenta, comportamiento_inadecuado, otro)';
COMMENT ON COLUMN public.invitados.razon_rechazo_detalle IS 'Detalle adicional cuando la razon es "otro"';
COMMENT ON COLUMN public.invitados.fecha_rechazo IS 'Fecha y hora del rechazo';
COMMENT ON COLUMN public.invitados.id_seguridad_rechazo IS 'Personal de seguridad que realizo el rechazo';

-- =============================================
-- Update RLS Policies to allow Seguridad to update rejection fields
-- =============================================

-- Drop existing update policy for seguridad if exists
DROP POLICY IF EXISTS "Seguridad can update ingreso status" ON public.invitados;
DROP POLICY IF EXISTS "Seguridad can update ingreso and rechazo" ON public.invitados;

-- Create new policy that allows updating both ingreso and rechazo fields
CREATE POLICY "Seguridad can update ingreso and rechazo"
ON public.invitados
FOR UPDATE
USING (
    -- Seguridad can only update invitados from their club
    public.check_user_has_role('seguridad'::user_role)
    AND uuid_evento IN (
        SELECT e.id FROM public.eventos e
        WHERE e.uuid_club = public.get_current_user_club()
    )
)
WITH CHECK (
    -- Seguridad can only update invitados from their club
    public.check_user_has_role('seguridad'::user_role)
    AND uuid_evento IN (
        SELECT e.id FROM public.eventos e
        WHERE e.uuid_club = public.get_current_user_club()
    )
);

-- =============================================
-- Function to reject an invitado
-- =============================================
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

    -- Update invitado as rejected
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rechazar_invitado(TEXT, razon_rechazo_type, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.rechazar_invitado IS 'Marca un invitado como rechazado con la razon especificada';
