-- =============================================
-- Migration: 008 - Create Triggers
-- Description: Triggers for updated_at and validations
-- =============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Actualiza automáticamente el campo updated_at';

-- Trigger: Update updated_at on clubs
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at on personal
CREATE TRIGGER update_personal_updated_at
    BEFORE UPDATE ON public.personal
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at on eventos
CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON public.eventos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update updated_at on invitados
CREATE TRIGGER update_invitados_updated_at
    BEFORE UPDATE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Validate admin creates evento
CREATE OR REPLACE FUNCTION public.validate_admin_creates_evento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    creator_role user_role;
    creator_club UUID;
BEGIN
    -- Get creator role and club
    SELECT rol, uuid_club INTO creator_role, creator_club
    FROM public.personal
    WHERE id = NEW.created_by;
    
    -- Validate admin role
    IF creator_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los admins pueden crear eventos';
    END IF;
    
    -- Validate same club
    IF creator_club != NEW.uuid_club THEN
        RAISE EXCEPTION 'Solo puedes crear eventos para tu propio club';
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_admin_creates_evento IS 'Valida que solo admins puedan crear eventos';

-- Trigger: Validate admin creates evento
CREATE TRIGGER validate_admin_creates_evento_trigger
    BEFORE INSERT ON public.eventos
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_admin_creates_evento();

-- Function: Validate rrpp creates invitado
CREATE OR REPLACE FUNCTION public.validate_rrpp_creates_invitado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rrpp_role user_role;
    rrpp_club UUID;
    evento_club UUID;
BEGIN
    -- Get RRPP role and club
    SELECT rol, uuid_club INTO rrpp_role, rrpp_club
    FROM public.personal
    WHERE id = NEW.id_rrpp;
    
    -- Validate RRPP role
    IF rrpp_role != 'rrpp' THEN
        RAISE EXCEPTION 'Solo los RRPP pueden crear invitados';
    END IF;
    
    -- Get evento club
    SELECT uuid_club INTO evento_club
    FROM public.eventos
    WHERE id = NEW.uuid_evento;
    
    -- Validate same club
    IF rrpp_club != evento_club THEN
        RAISE EXCEPTION 'Solo puedes crear invitados para eventos de tu propio club';
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_rrpp_creates_invitado IS 'Valida que solo RRPP puedan crear invitados';

-- Trigger: Validate rrpp creates invitado
CREATE TRIGGER validate_rrpp_creates_invitado_trigger
    BEFORE INSERT ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_rrpp_creates_invitado();

-- Function: Auto set fecha_ingreso when ingresado becomes true
CREATE OR REPLACE FUNCTION public.auto_set_fecha_ingreso()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ingresado = true AND OLD.ingresado = false THEN
        NEW.fecha_ingreso = NOW();
    END IF;
    
    IF NEW.ingresado = false THEN
        NEW.fecha_ingreso = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_set_fecha_ingreso IS 'Establece automáticamente fecha_ingreso cuando ingresado cambia a true';

-- Trigger: Auto set fecha_ingreso
CREATE TRIGGER auto_set_fecha_ingreso_trigger
    BEFORE UPDATE ON public.invitados
    FOR EACH ROW
    WHEN (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
    EXECUTE FUNCTION public.auto_set_fecha_ingreso();

-- Function: Increment total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.increment_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.eventos
    SET total_invitados = total_invitados + 1
    WHERE id = NEW.uuid_evento;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_total_invitados IS 'Incrementa el contador de invitados cuando se crea un nuevo invitado';

-- Trigger: Increment total_invitados when invitado is created
CREATE TRIGGER increment_total_invitados_trigger
    AFTER INSERT ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_total_invitados();

-- Function: Decrement total_invitados counter on evento
CREATE OR REPLACE FUNCTION public.decrement_total_invitados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.eventos
    SET total_invitados = GREATEST(total_invitados - 1, 0)
    WHERE id = OLD.uuid_evento;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.decrement_total_invitados IS 'Decrementa el contador de invitados cuando se elimina un invitado';

-- Trigger: Decrement total_invitados when invitado is deleted
CREATE TRIGGER decrement_total_invitados_trigger
    AFTER DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_total_invitados();

-- Function: Update total_ingresados counter on evento
CREATE OR REPLACE FUNCTION public.update_total_ingresados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si cambió de false a true (ingresó)
    IF NEW.ingresado = true AND OLD.ingresado = false THEN
        UPDATE public.eventos
        SET total_ingresados = total_ingresados + 1
        WHERE id = NEW.uuid_evento;

    -- Si cambió de true a false (salió o se marcó como no ingresado)
    ELSIF NEW.ingresado = false AND OLD.ingresado = true THEN
        UPDATE public.eventos
        SET total_ingresados = GREATEST(total_ingresados - 1, 0)
        WHERE id = NEW.uuid_evento;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_total_ingresados IS 'Actualiza el contador de ingresados cuando cambia el estado de ingresado';

-- Trigger: Update total_ingresados when ingresado status changes
CREATE TRIGGER update_total_ingresados_trigger
    AFTER UPDATE ON public.invitados
    FOR EACH ROW
    WHEN (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
    EXECUTE FUNCTION public.update_total_ingresados();

-- Function: Handle total_ingresados on invitado deletion
CREATE OR REPLACE FUNCTION public.handle_delete_ingresado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si el invitado eliminado estaba ingresado, decrementar el contador
    IF OLD.ingresado = true THEN
        UPDATE public.eventos
        SET total_ingresados = GREATEST(total_ingresados - 1, 0)
        WHERE id = OLD.uuid_evento;
    END IF;

    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.handle_delete_ingresado IS 'Decrementa el contador de ingresados si se elimina un invitado que había ingresado';

-- Trigger: Handle total_ingresados when invitado is deleted
CREATE TRIGGER handle_delete_ingresado_trigger
    AFTER DELETE ON public.invitados
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_delete_ingresado();
