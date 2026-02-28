-- ============================================================
-- 078: Comisión por tipo de moneda (ARS, USD, BRL)
-- ============================================================
-- Agrega columnas comision_ars, comision_usd, comision_reales en lotes y mesas.
-- Permite 0 o valor por moneda. Actualiza trigger validate_venta_mesa y vender_mesa.
-- ============================================================

-- ============================================================
-- 1. LOTES: comisión por moneda
-- ============================================================

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS comision_ars    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comision_usd    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comision_reales DECIMAL(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.lotes.comision_ars    IS 'Comisión RRPP en pesos (ARS). Usado cuando la venta es en ARS.';
COMMENT ON COLUMN public.lotes.comision_usd    IS 'Comisión RRPP en dólares (USD). Usado cuando la venta es en USD.';
COMMENT ON COLUMN public.lotes.comision_reales IS 'Comisión RRPP en reales (BRL). Usado cuando la venta es en BRL.';

-- Backfill: si ya tenían comision_tipo = monto, llevar ese valor a comision_ars
UPDATE public.lotes
SET comision_ars = comision_rrpp_monto
WHERE comision_tipo = 'monto' AND (comision_ars = 0 OR comision_ars IS NULL);

-- ============================================================
-- 2. MESAS: comisión por moneda
-- ============================================================

ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS comision_ars    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comision_usd    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comision_reales DECIMAL(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.mesas.comision_ars    IS 'Comisión RRPP en pesos (ARS). Usado cuando la venta es en ARS.';
COMMENT ON COLUMN public.mesas.comision_usd    IS 'Comisión RRPP en dólares (USD). Usado cuando la venta es en USD.';
COMMENT ON COLUMN public.mesas.comision_reales IS 'Comisión RRPP en reales (BRL). Usado cuando la venta es en BRL.';

-- Backfill
UPDATE public.mesas
SET comision_ars = comision_rrpp_monto
WHERE comision_tipo = 'monto' AND (comision_ars = 0 OR comision_ars IS NULL);

-- ============================================================
-- 3. Trigger validate_venta_mesa: usar comisión por moneda
-- ============================================================

CREATE OR REPLACE FUNCTION validate_venta_mesa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rrpp_club UUID;
    v_evento_club UUID;
    v_mesa RECORD;
BEGIN
    SELECT uuid_club INTO v_rrpp_club
    FROM public.personal
    WHERE id = NEW.id_rrpp AND rol = 'rrpp' AND activo = true;

    IF v_rrpp_club IS NULL THEN
        RAISE EXCEPTION 'El RRPP especificado no existe, no tiene rol RRPP, o esta inactivo';
    END IF;

    IF v_rrpp_club != NEW.uuid_club THEN
        RAISE EXCEPTION 'El RRPP debe pertenecer al mismo club';
    END IF;

    SELECT uuid_club INTO v_evento_club
    FROM public.eventos WHERE id = NEW.uuid_evento;

    IF v_evento_club != NEW.uuid_club THEN
        RAISE EXCEPTION 'El evento debe pertenecer al mismo club';
    END IF;

    -- Obtener mesa para comisión por moneda
    SELECT comision_tipo, comision_rrpp_porcentaje,
           comision_ars, comision_usd, comision_reales
    INTO v_mesa
    FROM public.mesas WHERE id = NEW.uuid_mesa;

    IF v_mesa.comision_tipo = 'porcentaje' THEN
        NEW.comision_calculada := (NEW.precio_venta * NEW.comision_rrpp_porcentaje / 100);
    ELSIF v_mesa.comision_tipo = 'monto' THEN
        NEW.comision_calculada := COALESCE(
            CASE COALESCE(NEW.moneda, 'ARS')
                WHEN 'ARS' THEN v_mesa.comision_ars
                WHEN 'USD' THEN v_mesa.comision_usd
                WHEN 'BRL' THEN v_mesa.comision_reales
                ELSE v_mesa.comision_ars
            END,
            0
        );
    ELSE
        RAISE EXCEPTION 'Tipo de comision invalido';
    END IF;

    CASE NEW.metodo_pago
        WHEN 'efectivo' THEN
            IF NEW.monto_efectivo != NEW.precio_venta OR NEW.monto_transferencia != 0 THEN
                RAISE EXCEPTION 'Para pago en efectivo: monto_efectivo debe ser igual a precio_venta y monto_transferencia debe ser 0';
            END IF;
        WHEN 'transferencia' THEN
            IF NEW.monto_transferencia != NEW.precio_venta OR NEW.monto_efectivo != 0 THEN
                RAISE EXCEPTION 'Para pago en transferencia: monto_transferencia debe ser igual a precio_venta y monto_efectivo debe ser 0';
            END IF;
        WHEN 'mixto' THEN
            IF NEW.monto_efectivo = 0 OR NEW.monto_transferencia = 0 THEN
                RAISE EXCEPTION 'Para pago mixto: tanto monto_efectivo como monto_transferencia deben ser mayores a 0';
            END IF;
            IF NEW.monto_efectivo + NEW.monto_transferencia != NEW.precio_venta THEN
                RAISE EXCEPTION 'Para pago mixto: la suma debe ser igual a precio_venta';
            END IF;
    END CASE;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_venta_mesa IS 'Calcula comision por moneda (comision_ars/usd/reales), valida club y montos de pago.';

-- ============================================================
-- 4. Función vender_mesa: comisión según moneda
-- ============================================================

CREATE OR REPLACE FUNCTION public.vender_mesa(
    p_uuid_mesa         UUID,
    p_cliente_dni       TEXT,
    p_cliente_nombre    TEXT    DEFAULT NULL,
    p_cliente_email     TEXT    DEFAULT NULL,
    p_precio_venta      DECIMAL DEFAULT NULL,
    p_metodo_pago       TEXT    DEFAULT 'efectivo',
    p_monto_efectivo    DECIMAL DEFAULT 0,
    p_monto_transferencia DECIMAL DEFAULT 0,
    p_moneda            TEXT    DEFAULT 'ARS'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id            UUID;
    v_user_role          user_role;
    v_user_club          UUID;
    v_mesa               RECORD;
    v_qr_code            TEXT;
    v_venta_id           UUID;
    v_precio_final       DECIMAL;
    v_comision_calculada DECIMAL;
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

    IF v_user_role != 'rrpp' THEN
        RETURN json_build_object('success', false, 'error', 'Solo RRPP puede vender mesas');
    END IF;

    SELECT * INTO v_mesa FROM public.mesas WHERE id = p_uuid_mesa;

    IF v_mesa.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Mesa no encontrada');
    END IF;

    IF v_mesa.uuid_club != v_user_club THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para este club');
    END IF;

    IF v_mesa.estado = 'vendido' THEN
        RETURN json_build_object('success', false, 'error', 'La mesa ya esta vendida');
    END IF;

    IF v_mesa.estado = 'reservado' AND v_mesa.id_rrpp != v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'La mesa esta reservada por otro RRPP');
    END IF;

    IF v_mesa.comision_tipo IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'La mesa no tiene comision configurada. Contacte al administrador.');
    END IF;

    IF p_moneda NOT IN ('ARS', 'USD', 'BRL') THEN
        RETURN json_build_object('success', false, 'error', 'Moneda inválida. Use ARS, USD o BRL.');
    END IF;

    v_precio_final := COALESCE(p_precio_venta, v_mesa.precio);

    -- Comisión según tipo y moneda
    IF v_mesa.comision_tipo = 'porcentaje' THEN
        v_comision_calculada := (v_precio_final * v_mesa.comision_rrpp_porcentaje / 100);
    ELSE
        v_comision_calculada := COALESCE(
            CASE p_moneda
                WHEN 'ARS' THEN v_mesa.comision_ars
                WHEN 'USD' THEN v_mesa.comision_usd
                WHEN 'BRL' THEN v_mesa.comision_reales
                ELSE v_mesa.comision_ars
            END,
            0
        );
    END IF;

    v_qr_code := 'MESA-' || p_uuid_mesa::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;

    INSERT INTO public.ventas_mesas (
        uuid_mesa, uuid_evento, uuid_club, id_rrpp,
        cliente_dni, cliente_nombre, cliente_email,
        precio_venta, comision_tipo, comision_rrpp_monto, comision_rrpp_porcentaje,
        comision_calculada, metodo_pago, monto_efectivo, monto_transferencia,
        moneda, qr_code
    ) VALUES (
        v_mesa.id, v_mesa.uuid_evento, v_mesa.uuid_club, v_user_id,
        p_cliente_dni, p_cliente_nombre, p_cliente_email,
        v_precio_final, v_mesa.comision_tipo, v_mesa.comision_rrpp_monto, v_mesa.comision_rrpp_porcentaje,
        v_comision_calculada, p_metodo_pago::metodo_pago_type, p_monto_efectivo, p_monto_transferencia,
        p_moneda, v_qr_code
    )
    RETURNING id INTO v_venta_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Mesa vendida exitosamente',
        'venta_id', v_venta_id,
        'mesa_id', v_mesa.id,
        'mesa_nombre', v_mesa.nombre,
        'qr_code', v_qr_code,
        'precio', v_precio_final,
        'moneda', p_moneda
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT) TO authenticated;

COMMENT ON FUNCTION public.vender_mesa IS 'RRPP vende una mesa. Comisión por moneda: comision_ars, comision_usd, comision_reales.';

-- ============================================================
-- 5. Actualizar ventas_mesas existentes: recalcular comision_calculada por moneda
-- ============================================================
-- Si hay ventas_mesas con moneda != ARS y comision_tipo = monto, actualizar comision_calculada
-- desde la mesa según la moneda de cada venta.

UPDATE public.ventas_mesas vm
SET comision_calculada = COALESCE(
    CASE vm.moneda
        WHEN 'ARS' THEN m.comision_ars
        WHEN 'USD' THEN m.comision_usd
        WHEN 'BRL' THEN m.comision_reales
        ELSE m.comision_ars
    END,
    vm.comision_calculada
)
FROM public.mesas m
WHERE m.id = vm.uuid_mesa
  AND m.comision_tipo = 'monto'
  AND vm.moneda IS NOT NULL;

-- ============================================================
-- 6. Vista ventas_rrpp_stats: comisión por moneda en lotes
-- ============================================================

DROP VIEW IF EXISTS public.ventas_rrpp_stats;

CREATE VIEW public.ventas_rrpp_stats AS
SELECT
    v.id_rrpp,
    v.uuid_evento,
    v.uuid_lote,
    l.nombre AS lote_nombre,
    l.precio AS lote_precio,
    l.es_vip AS lote_es_vip,
    l.comision_tipo,
    l.comision_rrpp_monto,
    l.comision_rrpp_porcentaje,
    COUNT(v.id) AS cantidad_ventas,
    SUM(v.monto_total) AS monto_total_vendido,
    SUM(v.monto_efectivo) AS monto_efectivo,
    SUM(v.monto_transferencia) AS monto_transferencia,
    SUM(CASE
        WHEN l.comision_tipo = 'porcentaje' THEN v.monto_total * (l.comision_rrpp_porcentaje / 100)
        WHEN l.comision_tipo = 'monto' THEN COALESCE(
            CASE COALESCE(v.moneda, 'ARS')
                WHEN 'ARS' THEN l.comision_ars
                WHEN 'USD' THEN l.comision_usd
                WHEN 'BRL' THEN l.comision_reales
                ELSE l.comision_ars
            END,
            0
        )
        ELSE 0
    END) AS comision_total
FROM public.ventas v
JOIN public.lotes l ON v.uuid_lote = l.id
GROUP BY
    v.id_rrpp,
    v.uuid_evento,
    v.uuid_lote,
    l.nombre,
    l.precio,
    l.es_vip,
    l.comision_tipo,
    l.comision_rrpp_monto,
    l.comision_rrpp_porcentaje,
    l.comision_ars,
    l.comision_usd,
    l.comision_reales;

COMMENT ON VIEW public.ventas_rrpp_stats IS 'Estadísticas por RRPP y lote. Comisión por moneda: comision_ars, comision_usd, comision_reales.';

GRANT SELECT ON public.ventas_rrpp_stats TO authenticated;

-- ============================================================
-- 7. Verificación
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lotes'
  AND column_name IN ('comision_ars', 'comision_usd', 'comision_reales')
ORDER BY column_name;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mesas'
  AND column_name IN ('comision_ars', 'comision_usd', 'comision_reales')
ORDER BY column_name;
