-- Migration: 068 - Create Sectores-Seguridad Assignment System
-- Description: Many-to-many relationship between sectores and security personnel
--              Security can only scan QR codes from mesas in their assigned sectores
-- Dependencies: 062_create_sectores_table.sql, 003_create_personal.sql, 057_create_lotes_seguridad_assignment.sql
-- Author: Claude Supabase Expert
-- Date: 2026-01-29

-- ============================================
-- SECTION 1: Table Creation (Many-to-Many)
-- ============================================

-- Create the junction table for sectores-seguridad assignment
CREATE TABLE IF NOT EXISTS public.sectores_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_sector UUID NOT NULL REFERENCES public.sectores(id) ON DELETE CASCADE,
    id_seguridad UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_sector_seguridad UNIQUE(uuid_sector, id_seguridad)
);

-- Create indexes for performance
CREATE INDEX idx_sectores_seguridad_uuid_sector ON public.sectores_seguridad(uuid_sector);
CREATE INDEX idx_sectores_seguridad_id_seguridad ON public.sectores_seguridad(id_seguridad);

-- Add comments
COMMENT ON TABLE public.sectores_seguridad IS 'Asignacion de personal de seguridad a sectores. Solo seguridad asignado puede escanear QR de mesas en ese sector.';
COMMENT ON COLUMN public.sectores_seguridad.uuid_sector IS 'Sector al que se asigna seguridad';
COMMENT ON COLUMN public.sectores_seguridad.id_seguridad IS 'Personal de seguridad asignado (debe tener rol = seguridad)';

-- ============================================
-- SECTION 2: Validation Trigger
-- ============================================

-- Function to validate that id_seguridad actually has 'seguridad' role
CREATE OR REPLACE FUNCTION validate_sectores_seguridad_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_personal_role user_role;
    v_personal_club UUID;
    v_sector_club UUID;
BEGIN
    -- Get the role and club of the person being assigned
    SELECT p.rol, p.uuid_club INTO v_personal_role, v_personal_club
    FROM public.personal p
    WHERE p.id = NEW.id_seguridad AND p.activo = true;

    IF v_personal_role IS NULL THEN
        RAISE EXCEPTION 'El personal especificado no existe o esta inactivo';
    END IF;

    IF v_personal_role != 'seguridad' THEN
        RAISE EXCEPTION 'Solo personal con rol "seguridad" puede ser asignado a sectores';
    END IF;

    -- Get the club of the sector
    SELECT s.uuid_club INTO v_sector_club
    FROM public.sectores s
    WHERE s.id = NEW.uuid_sector;

    IF v_sector_club IS NULL THEN
        RAISE EXCEPTION 'El sector especificado no existe';
    END IF;

    -- Validate that seguridad and sector belong to the same club
    IF v_personal_club != v_sector_club THEN
        RAISE EXCEPTION 'El personal de seguridad y el sector deben pertenecer al mismo club';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_sectores_seguridad_role
    BEFORE INSERT OR UPDATE ON public.sectores_seguridad
    FOR EACH ROW
    EXECUTE FUNCTION validate_sectores_seguridad_role();

COMMENT ON FUNCTION validate_sectores_seguridad_role IS 'Valida que solo personal con rol seguridad sea asignado a sectores y que pertenezcan al mismo club';

-- ============================================
-- SECTION 3: Trigger for updated_at
-- ============================================

CREATE TRIGGER trigger_update_sectores_seguridad_updated_at
    BEFORE UPDATE ON public.sectores_seguridad
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SECTION 4: RLS Policies
-- ============================================

ALTER TABLE public.sectores_seguridad ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see assignments from their club
CREATE POLICY "Users can view sectores_seguridad from their club"
ON public.sectores_seguridad
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.sectores s
        WHERE s.id = sectores_seguridad.uuid_sector
        AND s.uuid_club = public.get_current_user_club()
    )
);

-- INSERT: Only admins can assign seguridad to sectores
CREATE POLICY "Admins can assign seguridad to sectores"
ON public.sectores_seguridad
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.sectores s
        WHERE s.id = uuid_sector
        AND s.uuid_club = public.get_current_user_club()
    )
);

-- UPDATE: Only admins can modify assignments
CREATE POLICY "Admins can update sectores_seguridad"
ON public.sectores_seguridad
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.sectores s
        WHERE s.id = sectores_seguridad.uuid_sector
        AND s.uuid_club = public.get_current_user_club()
    )
);

-- DELETE: Only admins can remove assignments
CREATE POLICY "Admins can delete sectores_seguridad"
ON public.sectores_seguridad
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND EXISTS (
        SELECT 1
        FROM public.sectores s
        WHERE s.id = sectores_seguridad.uuid_sector
        AND s.uuid_club = public.get_current_user_club()
    )
);

-- ============================================
-- SECTION 5: Helper View - Seguridad Assigned Sectores
-- ============================================

-- View to easily see which sectores are assigned to which seguridad
CREATE OR REPLACE VIEW public.seguridad_sectores_asignados AS
SELECT
    ss.id,
    ss.uuid_sector,
    ss.id_seguridad,
    p.nombre AS seguridad_nombre,
    p.apellido AS seguridad_apellido,
    s.nombre AS sector_nombre,
    s.imagen_url AS sector_imagen_url,
    e.id AS uuid_evento,
    e.nombre AS evento_nombre,
    s.uuid_club,
    ss.created_at,
    ss.updated_at
FROM public.sectores_seguridad ss
JOIN public.personal p ON ss.id_seguridad = p.id
JOIN public.sectores s ON ss.uuid_sector = s.id
JOIN public.eventos e ON s.uuid_evento = e.id
WHERE p.activo = true
ORDER BY e.nombre, s.nombre, p.apellido, p.nombre;

-- Enable RLS on the view (security_invoker = true means it uses caller's permissions)
ALTER VIEW public.seguridad_sectores_asignados SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW public.seguridad_sectores_asignados IS 'Vista con informacion detallada de asignaciones seguridad-sectores';

-- Grant select permission
GRANT SELECT ON public.seguridad_sectores_asignados TO authenticated;

-- ============================================
-- SECTION 6: RPC Function - Get My Assigned Sectores
-- ============================================

-- Function for seguridad to see their assigned sectores
CREATE OR REPLACE FUNCTION public.get_my_assigned_sectores()
RETURNS TABLE (
    uuid_sector UUID,
    sector_nombre TEXT,
    sector_imagen_url TEXT,
    uuid_evento UUID,
    evento_nombre TEXT,
    evento_fecha TIMESTAMPTZ,
    mesas_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_user_club UUID;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Get user role and club
    SELECT p.rol, p.uuid_club INTO v_user_role, v_user_club
    FROM public.personal p
    WHERE p.id = v_user_id AND p.activo = true;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado o inactivo';
    END IF;

    IF v_user_role != 'seguridad' THEN
        RAISE EXCEPTION 'Solo personal de seguridad puede ver sectores asignados';
    END IF;

    -- Return assigned sectores with mesa count
    RETURN QUERY
    SELECT
        s.id AS uuid_sector,
        s.nombre AS sector_nombre,
        s.imagen_url AS sector_imagen_url,
        e.id AS uuid_evento,
        e.nombre AS evento_nombre,
        e.fecha AS evento_fecha,
        COUNT(m.id) AS mesas_count
    FROM public.sectores_seguridad ss
    JOIN public.sectores s ON ss.uuid_sector = s.id
    JOIN public.eventos e ON s.uuid_evento = e.id
    LEFT JOIN public.mesas m ON m.uuid_sector = s.id AND m.activo = true
    WHERE ss.id_seguridad = v_user_id
    AND e.uuid_club = v_user_club
    AND e.estado = true -- Only active events
    AND s.activo = true
    GROUP BY s.id, s.nombre, s.imagen_url, e.id, e.nombre, e.fecha
    ORDER BY e.fecha DESC, s.nombre;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_assigned_sectores() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_my_assigned_sectores IS 'Retorna los sectores asignados al seguridad actual con conteo de mesas';

-- ============================================
-- SECTION 7: RPC Function - Get Seguridad for Sector
-- ============================================

-- Function to get all seguridad assigned to a specific sector
CREATE OR REPLACE FUNCTION public.get_seguridad_by_sector(
    p_uuid_sector UUID
)
RETURNS TABLE (
    id_seguridad UUID,
    nombre TEXT,
    apellido TEXT,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_club UUID;
    v_sector_club UUID;
BEGIN
    -- Get current user club
    v_user_club := public.get_current_user_club();

    IF v_user_club IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Get sector club
    SELECT s.uuid_club INTO v_sector_club
    FROM public.sectores s
    WHERE s.id = p_uuid_sector;

    IF v_sector_club IS NULL THEN
        RAISE EXCEPTION 'Sector no encontrado';
    END IF;

    -- Verify club match
    IF v_sector_club != v_user_club THEN
        RAISE EXCEPTION 'No tienes permiso para ver este sector';
    END IF;

    -- Return assigned seguridad
    RETURN QUERY
    SELECT
        p.id AS id_seguridad,
        p.nombre,
        p.apellido,
        au.email
    FROM public.sectores_seguridad ss
    JOIN public.personal p ON ss.id_seguridad = p.id
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE ss.uuid_sector = p_uuid_sector
    AND p.activo = true
    AND p.rol = 'seguridad'
    ORDER BY p.apellido, p.nombre;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_seguridad_by_sector(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_seguridad_by_sector IS 'Retorna todo el personal de seguridad asignado a un sector especifico';

-- ============================================
-- SECTION 8: RPC Function - Assign Multiple Seguridad
-- ============================================

-- Bulk assign multiple seguridad to a sector
CREATE OR REPLACE FUNCTION public.assign_seguridad_to_sector(
    p_uuid_sector UUID,
    p_seguridad_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role user_role;
    v_user_club UUID;
    v_sector_club UUID;
    v_seguridad_id UUID;
    v_assigned_count INTEGER := 0;
BEGIN
    -- Get current user info
    SELECT public.get_current_user_role(), public.get_current_user_club()
    INTO v_user_role, v_user_club;

    IF v_user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'error', 'Solo administradores pueden asignar seguridad');
    END IF;

    -- Get sector club
    SELECT s.uuid_club INTO v_sector_club
    FROM public.sectores s
    WHERE s.id = p_uuid_sector;

    IF v_sector_club IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Sector no encontrado');
    END IF;

    IF v_sector_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'El sector no pertenece a tu club');
    END IF;

    -- Insert assignments (ON CONFLICT DO NOTHING for idempotency)
    FOREACH v_seguridad_id IN ARRAY p_seguridad_ids
    LOOP
        INSERT INTO public.sectores_seguridad (uuid_sector, id_seguridad)
        VALUES (p_uuid_sector, v_seguridad_id)
        ON CONFLICT (uuid_sector, id_seguridad) DO NOTHING;

        IF FOUND THEN
            v_assigned_count := v_assigned_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', format('%s seguridad asignados exitosamente', v_assigned_count),
        'assigned_count', v_assigned_count
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_seguridad_to_sector(UUID, UUID[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.assign_seguridad_to_sector IS 'Asigna multiples personal de seguridad a un sector (bulk assignment)';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sectores_seguridad') THEN
        RAISE NOTICE '✅ Table sectores_seguridad created successfully';
    END IF;

    -- Check RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sectores_seguridad' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS enabled on sectores_seguridad';
    END IF;

    -- Check policies exist
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sectores_seguridad') >= 4 THEN
        RAISE NOTICE '✅ RLS policies created for sectores_seguridad';
    END IF;

    -- Check triggers exist
    IF (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'sectores_seguridad') >= 2 THEN
        RAISE NOTICE '✅ Triggers created for sectores_seguridad';
    END IF;

    -- Check view exists
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'seguridad_sectores_asignados') THEN
        RAISE NOTICE '✅ View seguridad_sectores_asignados created';
    END IF;

    -- Check functions exist
    IF (SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN (
            'get_my_assigned_sectores',
            'get_seguridad_by_sector',
            'assign_seguridad_to_sector'
        )
    ) = 3 THEN
        RAISE NOTICE '✅ All helper functions created';
    END IF;

    RAISE NOTICE '✅ Migration 068 completed successfully';
END $$;

-- ============================================
-- ROLLBACK (commented out for safety)
-- ============================================

/*
-- Drop functions
DROP FUNCTION IF EXISTS public.get_my_assigned_sectores();
DROP FUNCTION IF EXISTS public.get_seguridad_by_sector(UUID);
DROP FUNCTION IF EXISTS public.assign_seguridad_to_sector(UUID, UUID[]);

-- Drop view
DROP VIEW IF EXISTS public.seguridad_sectores_asignados;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_validate_sectores_seguridad_role ON public.sectores_seguridad;
DROP TRIGGER IF EXISTS trigger_update_sectores_seguridad_updated_at ON public.sectores_seguridad;
DROP FUNCTION IF EXISTS validate_sectores_seguridad_role();

-- Drop table (will cascade to delete all assignments)
DROP TABLE IF EXISTS public.sectores_seguridad CASCADE;
*/
