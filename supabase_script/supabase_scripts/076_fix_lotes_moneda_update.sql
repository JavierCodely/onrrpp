-- ============================================================
-- 076: Fix lotes moneda columns + RLS UPDATE policy
-- ============================================================
-- Asegura idempotencia de columnas precio_usd / precio_reales en lotes
-- y añade WITH CHECK explícito a la política de UPDATE para admins.
-- Ejecutar si los cambios de precio USD/BRL en lotes no se guardan.
-- ============================================================

-- ============================================================
-- 1. Asegurar columnas (idempotente con IF NOT EXISTS)
-- ============================================================

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS precio_usd    DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS precio_reales DECIMAL(10, 2) DEFAULT NULL;

-- ============================================================
-- 2. Constraints idempotentes (con bloque DO para no fallar si ya existen)
-- ============================================================

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.lotes
      ADD CONSTRAINT lotes_precio_usd_valido
      CHECK (precio_usd IS NULL OR precio_usd >= 0);
  EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ya existe, ignorar
  END;

  BEGIN
    ALTER TABLE public.lotes
      ADD CONSTRAINT lotes_precio_reales_valido
      CHECK (precio_reales IS NULL OR precio_reales >= 0);
  EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ya existe, ignorar
  END;
END;
$$;

-- ============================================================
-- 3. Recrear política UPDATE de lotes con WITH CHECK explícito
-- ============================================================
-- La política anterior solo tenía USING pero no WITH CHECK,
-- lo que puede causar rechazos silenciosos en algunas versiones de Supabase.

DROP POLICY IF EXISTS "Admins can update lotes" ON public.lotes;

CREATE POLICY "Admins can update lotes"
ON public.lotes
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
)
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

COMMENT ON POLICY "Admins can update lotes" ON public.lotes IS
'Solo admins pueden modificar lotes de eventos de su club. WITH CHECK explícito para garantizar que la fila actualizada también cumpla la condición.';

-- ============================================================
-- 4. Asegurar columnas en mesas también (idempotente)
-- ============================================================

ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS precio_usd    DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS precio_reales DECIMAL(10, 2) DEFAULT NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.mesas
      ADD CONSTRAINT mesas_precio_usd_valido
      CHECK (precio_usd IS NULL OR precio_usd >= 0);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.mesas
      ADD CONSTRAINT mesas_precio_reales_valido
      CHECK (precio_reales IS NULL OR precio_reales >= 0);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- ============================================================
-- 5. Asegurar columna moneda en ventas y ventas_mesas (idempotente)
-- ============================================================

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_moneda_valida CHECK (moneda IN ('ARS', 'USD', 'BRL'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END;
$$;

ALTER TABLE public.ventas_mesas
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ventas_mesas
      ADD CONSTRAINT ventas_mesas_moneda_valida CHECK (moneda IN ('ARS', 'USD', 'BRL'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- ============================================================
-- 6. Verificación final
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lotes'
  AND column_name IN ('precio', 'precio_usd', 'precio_reales')
ORDER BY column_name;
