-- =============================================
-- Migration: 021 - Prevent Delete of Ingresados
-- Description: Add trigger to prevent deletion of invitados that have already entered
-- =============================================

-- Function to prevent deletion of invitados who already entered
CREATE OR REPLACE FUNCTION public.prevent_delete_ingresados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.ingresado = true THEN
        RAISE EXCEPTION 'No se puede eliminar un invitado que ya ingresó al evento';
    END IF;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.prevent_delete_ingresados IS 'Previene la eliminación de invitados que ya ingresaron';

-- Trigger to prevent deletion
CREATE TRIGGER prevent_delete_ingresados_trigger
    BEFORE DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_delete_ingresados();

COMMENT ON TRIGGER prevent_delete_ingresados_trigger ON public.invitados IS 'Previene eliminar invitados que ya ingresaron';
