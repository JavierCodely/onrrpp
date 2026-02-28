-- ============================================================
-- 074: Soporte Multi-Moneda para Lotes, Mesas, Ventas y Ventas_Mesas
-- ============================================================
-- Agrega columnas de precio en USD y Reales a lotes y mesas.
-- Agrega columna de tipo de moneda a ventas y ventas_mesas.
-- Monedas soportadas: ARS (Pesos - default), USD, BRL (Reales)
-- ============================================================

-- ============================================================
-- 1. TABLA LOTES: agregar precio_usd y precio_reales
-- ============================================================

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS precio_usd    DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS precio_reales DECIMAL(10, 2) DEFAULT NULL;

-- Constraints opcionales: si se carga precio alternativo debe ser >= 0
ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_precio_usd_valido    CHECK (precio_usd    IS NULL OR precio_usd    >= 0),
  ADD CONSTRAINT lotes_precio_reales_valido CHECK (precio_reales IS NULL OR precio_reales >= 0);

COMMENT ON COLUMN public.lotes.precio_usd    IS 'Precio en dólares (USD). NULL si no aplica.';
COMMENT ON COLUMN public.lotes.precio_reales IS 'Precio en reales (BRL). NULL si no aplica.';

-- ============================================================
-- 2. TABLA MESAS: agregar precio_usd y precio_reales
-- ============================================================

ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS precio_usd    DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS precio_reales DECIMAL(10, 2) DEFAULT NULL;

ALTER TABLE public.mesas
  ADD CONSTRAINT mesas_precio_usd_valido    CHECK (precio_usd    IS NULL OR precio_usd    >= 0),
  ADD CONSTRAINT mesas_precio_reales_valido CHECK (precio_reales IS NULL OR precio_reales >= 0);

COMMENT ON COLUMN public.mesas.precio_usd    IS 'Precio en dólares (USD). NULL si no aplica.';
COMMENT ON COLUMN public.mesas.precio_reales IS 'Precio en reales (BRL). NULL si no aplica.';

-- ============================================================
-- 3. TABLA VENTAS: agregar columna moneda
-- ============================================================

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_moneda_valida CHECK (moneda IN ('ARS', 'USD', 'BRL'));

COMMENT ON COLUMN public.ventas.moneda IS 'Moneda de la venta: ARS (Pesos), USD (Dólares), BRL (Reales).';

-- ============================================================
-- 4. TABLA VENTAS_MESAS: agregar columna moneda
-- ============================================================

ALTER TABLE public.ventas_mesas
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';

ALTER TABLE public.ventas_mesas
  ADD CONSTRAINT ventas_mesas_moneda_valida CHECK (moneda IN ('ARS', 'USD', 'BRL'));

COMMENT ON COLUMN public.ventas_mesas.moneda IS 'Moneda de la venta de mesa: ARS (Pesos), USD (Dólares), BRL (Reales).';

-- ============================================================
-- 5. ACTUALIZAR FUNCIÓN vender_mesa PARA ACEPTAR p_moneda
-- ============================================================

-- Primero eliminar la función existente (misma firma que en 073)
DROP FUNCTION IF EXISTS public.vender_mesa(UUID, TEXT, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL);

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

    -- Validar moneda
    IF p_moneda NOT IN ('ARS', 'USD', 'BRL') THEN
        RETURN json_build_object('success', false, 'error', 'Moneda inválida. Use ARS, USD o BRL.');
    END IF;

    v_precio_final := COALESCE(p_precio_venta, v_mesa.precio);

    -- Calcular comisión
    IF v_mesa.comision_tipo = 'porcentaje' THEN
        v_comision_calculada := (v_precio_final * v_mesa.comision_rrpp_porcentaje / 100);
    ELSE
        v_comision_calculada := v_mesa.comision_rrpp_monto;
    END IF;

    v_qr_code := 'MESA-' || p_uuid_mesa::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;

    INSERT INTO public.ventas_mesas (
        uuid_mesa,
        uuid_evento,
        uuid_club,
        id_rrpp,
        cliente_dni,
        cliente_nombre,
        cliente_email,
        precio_venta,
        comision_tipo,
        comision_rrpp_monto,
        comision_rrpp_porcentaje,
        comision_calculada,
        metodo_pago,
        monto_efectivo,
        monto_transferencia,
        moneda,
        qr_code
    ) VALUES (
        v_mesa.id,
        v_mesa.uuid_evento,
        v_mesa.uuid_club,
        v_user_id,
        p_cliente_dni,
        p_cliente_nombre,
        p_cliente_email,
        v_precio_final,
        v_mesa.comision_tipo,
        v_mesa.comision_rrpp_monto,
        v_mesa.comision_rrpp_porcentaje,
        v_comision_calculada,
        p_metodo_pago::metodo_pago_type,
        p_monto_efectivo,
        p_monto_transferencia,
        p_moneda,
        v_qr_code
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

COMMENT ON FUNCTION public.vender_mesa IS 'RRPP vende una mesa (crea venta con QR, cambia estado a vendido). Soporta múltiples monedas: ARS, USD, BRL.';

-- ============================================================
-- 6. ACTUALIZAR POLÍTICAS RLS (si es necesario)
-- Las políticas existentes se mantienen; solo se agregan columnas.
-- No se requieren cambios en RLS para esta migración.
-- ============================================================

-- ============================================================
-- 6. VERIFICACIÓN
-- ============================================================

-- Verificar columnas en lotes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lotes'
  AND column_name IN ('precio', 'precio_usd', 'precio_reales')
ORDER BY column_name;

-- Verificar columnas en mesas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mesas'
  AND column_name IN ('precio', 'precio_usd', 'precio_reales')
ORDER BY column_name;

-- Verificar columnas en ventas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ventas'
  AND column_name = 'moneda';

-- Verificar columnas en ventas_mesas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ventas_mesas'
  AND column_name = 'moneda';
