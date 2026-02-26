-- =============================================
-- Migration: 022 - Prevent Delete of Ingresados
-- Description: Add trigger to prevent deletion of invitados that have already entered
-- Dependencies: 005_create_invitados.sql
-- Version: 1.0 (Consolidated from 021_prevent_delete_ingresados.sql)
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

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_delete_ingresados_trigger'
        AND event_object_table = 'invitados'
    ) THEN
        CREATE TRIGGER prevent_delete_ingresados_trigger
            BEFORE DELETE ON public.invitados
            FOR EACH ROW
            EXECUTE FUNCTION public.prevent_delete_ingresados();

        RAISE NOTICE 'Trigger prevent_delete_ingresados_trigger created successfully';
    ELSE
        RAISE NOTICE 'Trigger prevent_delete_ingresados_trigger already exists';
    END IF;
END $$;

COMMENT ON TRIGGER prevent_delete_ingresados_trigger ON public.invitados IS 'Previene eliminar invitados que ya ingresaron';
