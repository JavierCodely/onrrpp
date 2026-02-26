-- =============================================
-- Update Migration: 001 - Add QR Code to Invitados
-- Description: Add qr_code field to store unique QR identifier for each guest
-- =============================================

-- Add qr_code column to invitados table
ALTER TABLE public.invitados
ADD COLUMN qr_code TEXT UNIQUE;

-- Create index for fast QR lookups
CREATE INDEX idx_invitados_qr_code ON public.invitados(qr_code);

-- Add comment
COMMENT ON COLUMN public.invitados.qr_code IS 'Código QR único generado para el invitado';

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_unique_qr_code()
RETURNS TEXT AS $$
DECLARE
    new_qr_code TEXT;
    qr_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random alphanumeric code (12 characters)
        new_qr_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12));

        -- Check if it already exists
        SELECT EXISTS(SELECT 1 FROM public.invitados WHERE qr_code = new_qr_code) INTO qr_exists;

        -- Exit loop if unique
        EXIT WHEN NOT qr_exists;
    END LOOP;

    RETURN new_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate QR code on insert
CREATE OR REPLACE FUNCTION set_invitado_qr_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code IS NULL THEN
        NEW.qr_code := generate_unique_qr_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invitado_qr_code
BEFORE INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION set_invitado_qr_code();

-- Generate QR codes for existing invitados (if any)
UPDATE public.invitados
SET qr_code = generate_unique_qr_code()
WHERE qr_code IS NULL;

-- Make qr_code NOT NULL after generating codes for existing records
ALTER TABLE public.invitados
ALTER COLUMN qr_code SET NOT NULL;
