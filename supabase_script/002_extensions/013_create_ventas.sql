-- =============================================
-- Migration: 013 - Create Ventas (Sales) Table
-- Description: Payment tracking for guest list sales
-- Dependencies: 005_create_invitados.sql, 012_create_lotes.sql
-- Version: 1.0 (Consolidated from update/003_create_ventas.sql)
-- =============================================

-- ========================================
-- STEP 1: Create metodo_pago enum
-- ========================================

CREATE TYPE metodo_pago_type AS ENUM ('efectivo', 'transferencia', 'mixto');

COMMENT ON TYPE metodo_pago_type IS 'Métodos de pago disponibles: efectivo, transferencia o mixto';

-- ========================================
-- STEP 2: Create ventas table
-- ========================================

CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_invitado UUID NOT NULL REFERENCES public.invitados(id) ON DELETE CASCADE,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    uuid_lote UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
    id_rrpp UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
    metodo_pago metodo_pago_type NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL,
    monto_efectivo DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_transferencia DECIMAL(10, 2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT monto_total_valido CHECK (monto_total >= 0),
    CONSTRAINT monto_efectivo_valido CHECK (monto_efectivo >= 0),
    CONSTRAINT monto_transferencia_valido CHECK (monto_transferencia >= 0),
    CONSTRAINT suma_montos_valida CHECK (monto_efectivo + monto_transferencia = monto_total),
    CONSTRAINT invitado_unico UNIQUE (uuid_invitado)
);

-- ========================================
-- STEP 3: Create indexes
-- ========================================

CREATE INDEX idx_ventas_uuid_invitado ON public.ventas(uuid_invitado);
CREATE INDEX idx_ventas_uuid_evento ON public.ventas(uuid_evento);
CREATE INDEX idx_ventas_uuid_lote ON public.ventas(uuid_lote);
CREATE INDEX idx_ventas_id_rrpp ON public.ventas(id_rrpp);
CREATE INDEX idx_ventas_metodo_pago ON public.ventas(metodo_pago);
CREATE INDEX idx_ventas_created_at ON public.ventas(created_at);
CREATE INDEX idx_ventas_rrpp_evento ON public.ventas(id_rrpp, uuid_evento);

-- ========================================
-- STEP 4: Add comments
-- ========================================

COMMENT ON TABLE public.ventas IS 'Registro de ventas y pagos de invitados';
COMMENT ON COLUMN public.ventas.uuid_invitado IS 'Invitado asociado a la venta';
COMMENT ON COLUMN public.ventas.uuid_evento IS 'Evento de la venta';
COMMENT ON COLUMN public.ventas.uuid_lote IS 'Lote vendido';
COMMENT ON COLUMN public.ventas.id_rrpp IS 'RRPP que realizó la venta';
COMMENT ON COLUMN public.ventas.metodo_pago IS 'Método de pago utilizado';
COMMENT ON COLUMN public.ventas.monto_total IS 'Monto total de la venta (igual al precio del lote)';
COMMENT ON COLUMN public.ventas.monto_efectivo IS 'Monto pagado en efectivo';
COMMENT ON COLUMN public.ventas.monto_transferencia IS 'Monto pagado por transferencia';
COMMENT ON COLUMN public.ventas.observaciones IS 'Notas adicionales sobre la venta';

-- ========================================
-- STEP 5: Trigger to validate payment amounts based on payment method
-- ========================================

CREATE OR REPLACE FUNCTION validate_venta_montos()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate based on payment method
    CASE NEW.metodo_pago
        WHEN 'efectivo' THEN
            IF NEW.monto_efectivo != NEW.monto_total OR NEW.monto_transferencia != 0 THEN
                RAISE EXCEPTION 'Para pago en efectivo: monto_efectivo debe ser igual a monto_total y monto_transferencia debe ser 0';
            END IF;
        WHEN 'transferencia' THEN
            IF NEW.monto_transferencia != NEW.monto_total OR NEW.monto_efectivo != 0 THEN
                RAISE EXCEPTION 'Para pago en transferencia: monto_transferencia debe ser igual a monto_total y monto_efectivo debe ser 0';
            END IF;
        WHEN 'mixto' THEN
            IF NEW.monto_efectivo = 0 OR NEW.monto_transferencia = 0 THEN
                RAISE EXCEPTION 'Para pago mixto: tanto monto_efectivo como monto_transferencia deben ser mayores a 0';
            END IF;
            IF NEW.monto_efectivo + NEW.monto_transferencia != NEW.monto_total THEN
                RAISE EXCEPTION 'Para pago mixto: la suma de monto_efectivo y monto_transferencia debe ser igual a monto_total';
            END IF;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_venta_montos IS 'Valida que los montos de pago sean correctos según el método de pago';

CREATE TRIGGER trigger_validate_venta_montos
BEFORE INSERT OR UPDATE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION validate_venta_montos();

-- ========================================
-- STEP 6: Trigger to update updated_at timestamp
-- ========================================

CREATE TRIGGER trigger_ventas_updated_at
BEFORE UPDATE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- STEP 7: Enable RLS on ventas
-- ========================================

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 8: RLS POLICIES for ventas
-- ========================================

-- RLS Policy: Users can see ventas of their club's events
CREATE POLICY "Users can view ventas of their club"
ON public.ventas
FOR SELECT
USING (
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: RRPP can create ventas for their invitados
CREATE POLICY "RRPP can create ventas"
ON public.ventas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
    AND uuid_invitado IN (
        SELECT id FROM public.invitados
        WHERE id_rrpp = auth.uid()
    )
);

-- RLS Policy: Admins can create ventas
CREATE POLICY "Admins can create ventas"
ON public.ventas
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: RRPP can update their own ventas
CREATE POLICY "RRPP can update their ventas"
ON public.ventas
FOR UPDATE
USING (
    public.check_user_has_role('rrpp'::user_role)
    AND id_rrpp = auth.uid()
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Admins can update all ventas of their club
CREATE POLICY "Admins can update ventas"
ON public.ventas
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can delete ventas
CREATE POLICY "Admins can delete ventas"
ON public.ventas
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);
