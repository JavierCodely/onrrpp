-- ============================================================
-- 077: RPC update_lote (SECURITY DEFINER)
-- ============================================================
-- Función que permite al admin actualizar todos los campos de un lote
-- incluyendo precio_usd y precio_reales usando SECURITY DEFINER
-- para evitar bloqueos silenciosos de RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_lote(
    p_lote_id              UUID,
    p_nombre               TEXT,
    p_cantidad_maxima      INTEGER,
    p_precio               DECIMAL(10,2),
    p_precio_usd           DECIMAL(10,2),    -- NULL = limpiar el precio
    p_precio_reales        DECIMAL(10,2),    -- NULL = limpiar el precio
    p_es_vip               BOOLEAN,
    p_grupo                TEXT,             -- NULL = sin grupo / todos
    p_comision_tipo        TEXT,
    p_comision_rrpp_monto  DECIMAL(10,2),
    p_comision_porcentaje  DECIMAL(5,2),
    p_comision_ars         DECIMAL(10,2)   DEFAULT 0,
    p_comision_usd         DECIMAL(10,2)   DEFAULT 0,
    p_comision_reales      DECIMAL(10,2)   DEFAULT 0,
    p_activo               BOOLEAN         DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID;
    v_user_role user_role;
    v_user_club UUID;
    v_lote_club UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
    END IF;

    SELECT rol, uuid_club INTO v_user_role, v_user_club
    FROM public.personal
    WHERE id = v_user_id AND activo = true;

    IF v_user_role IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado o inactivo');
    END IF;

    IF v_user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'error', 'Solo administradores pueden editar lotes');
    END IF;

    -- Verificar que el lote pertenece al club del admin
    SELECT e.uuid_club INTO v_lote_club
    FROM public.lotes l
    JOIN public.eventos e ON e.id = l.uuid_evento
    WHERE l.id = p_lote_id;

    IF v_lote_club IS NULL OR v_lote_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'Lote no encontrado o sin permiso');
    END IF;

    UPDATE public.lotes SET
        nombre                   = p_nombre,
        cantidad_maxima          = p_cantidad_maxima,
        precio                   = p_precio,
        precio_usd               = p_precio_usd,
        precio_reales            = p_precio_reales,
        es_vip                   = p_es_vip,
        grupo                    = p_grupo::grupo_type,
        comision_tipo            = p_comision_tipo::comision_tipo,
        comision_rrpp_monto      = p_comision_rrpp_monto,
        comision_rrpp_porcentaje = p_comision_porcentaje,
        comision_ars             = COALESCE(p_comision_ars, 0),
        comision_usd             = COALESCE(p_comision_usd, 0),
        comision_reales          = COALESCE(p_comision_reales, 0),
        activo                   = COALESCE(p_activo, activo)
    WHERE id = p_lote_id;

    RETURN json_build_object('success', true, 'lote_id', p_lote_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lote(UUID, TEXT, INTEGER, DECIMAL, DECIMAL, DECIMAL, BOOLEAN, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.update_lote IS 'Admin actualiza todos los campos de un lote (incluyendo precio_usd/precio_reales). SECURITY DEFINER para evitar bloqueos de RLS.';
