-- =============================================
-- Update Migration: 002 - Create Lotes Table
-- Description: Event batches with pricing and VIP categories
-- =============================================

-- Create lotes table
CREATE TABLE public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cantidad_maxima INTEGER NOT NULL,
    cantidad_actual INTEGER NOT NULL DEFAULT 0,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    es_vip BOOLEAN NOT NULL DEFAULT false,
    uuid_evento UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT cantidad_maxima_valida CHECK (cantidad_maxima > 0),
    CONSTRAINT cantidad_actual_valida CHECK (cantidad_actual >= 0),
    CONSTRAINT cantidad_no_excede_maximo CHECK (cantidad_actual <= cantidad_maxima),
    CONSTRAINT precio_valido CHECK (precio >= 0)
);

-- Add uuid_lote to invitados table
ALTER TABLE public.invitados
ADD COLUMN uuid_lote UUID REFERENCES public.lotes(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_lotes_uuid_evento ON public.lotes(uuid_evento);
CREATE INDEX idx_lotes_activo ON public.lotes(activo);
CREATE INDEX idx_lotes_es_vip ON public.lotes(es_vip);
CREATE INDEX idx_invitados_uuid_lote ON public.invitados(uuid_lote);

-- Add comments
COMMENT ON TABLE public.lotes IS 'Lotes de invitados por evento con precios y categorías';
COMMENT ON COLUMN public.lotes.nombre IS 'Nombre del lote (ej: Early Bird, VIP Gold)';
COMMENT ON COLUMN public.lotes.cantidad_maxima IS 'Cantidad máxima de invitados en este lote';
COMMENT ON COLUMN public.lotes.cantidad_actual IS 'Cantidad actual de invitados en este lote';
COMMENT ON COLUMN public.lotes.precio IS 'Precio del lote (puede ser 0 para free)';
COMMENT ON COLUMN public.lotes.es_vip IS 'Si es categoría VIP (permite múltiples escaneos)';
COMMENT ON COLUMN public.invitados.uuid_lote IS 'Lote al que pertenece el invitado';

-- Trigger to update cantidad_actual on lote when invitado is created
CREATE OR REPLACE FUNCTION increment_lote_cantidad()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;

        -- Check if lote is full
        IF (SELECT cantidad_actual >= cantidad_maxima FROM public.lotes WHERE id = NEW.uuid_lote) THEN
            RAISE EXCEPTION 'El lote está completo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_lote_cantidad
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION increment_lote_cantidad();

-- Trigger to update cantidad_actual on lote when invitado is deleted
CREATE OR REPLACE FUNCTION decrement_lote_cantidad()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual - 1
        WHERE id = OLD.uuid_lote;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_lote_cantidad
AFTER DELETE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION decrement_lote_cantidad();

-- Trigger to handle lote change on invitado update
CREATE OR REPLACE FUNCTION update_lote_cantidad()
RETURNS TRIGGER AS $$
BEGIN
    -- If lote changed
    IF OLD.uuid_lote IS DISTINCT FROM NEW.uuid_lote THEN
        -- Decrement old lote
        IF OLD.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual - 1
            WHERE id = OLD.uuid_lote;
        END IF;

        -- Increment new lote
        IF NEW.uuid_lote IS NOT NULL THEN
            UPDATE public.lotes
            SET cantidad_actual = cantidad_actual + 1
            WHERE id = NEW.uuid_lote;

            -- Check if new lote is full
            IF (SELECT cantidad_actual >= cantidad_maxima FROM public.lotes WHERE id = NEW.uuid_lote) THEN
                RAISE EXCEPTION 'El lote está completo';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lote_cantidad
BEFORE UPDATE ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION update_lote_cantidad();

-- Enable RLS on lotes
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see lotes of their club's events
CREATE POLICY "Users can view lotes of their club"
ON public.lotes
FOR SELECT
USING (
    uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can create lotes
CREATE POLICY "Admins can create lotes"
ON public.lotes
FOR INSERT
WITH CHECK (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can update lotes
CREATE POLICY "Admins can update lotes"
ON public.lotes
FOR UPDATE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);

-- RLS Policy: Only admins can delete lotes
CREATE POLICY "Admins can delete lotes"
ON public.lotes
FOR DELETE
USING (
    public.check_user_has_role('admin'::user_role)
    AND uuid_evento IN (
        SELECT id FROM public.eventos
        WHERE uuid_club = public.get_current_user_club()
    )
);
