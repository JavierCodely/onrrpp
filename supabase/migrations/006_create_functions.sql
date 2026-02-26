-- =============================================
-- Migration: 006 - Create Helper Functions
-- Description: Functions for RLS policies and business logic
-- =============================================

-- Function: Get current user's club
CREATE OR REPLACE FUNCTION public.get_current_user_club()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT uuid_club 
    FROM public.personal 
    WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_club IS 'Retorna el uuid_club del usuario autenticado';

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT rol 
    FROM public.personal 
    WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_role IS 'Retorna el rol del usuario autenticado';

-- Function: Check if user has specific role
CREATE OR REPLACE FUNCTION public.check_user_has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.personal 
        WHERE id = auth.uid() 
        AND rol = required_role
        AND activo = true
    );
$$;

COMMENT ON FUNCTION public.check_user_has_role IS 'Verifica si el usuario tiene un rol específico';

-- Function: Check if user belongs to club
CREATE OR REPLACE FUNCTION public.user_belongs_to_club(club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.personal 
        WHERE id = auth.uid() 
        AND uuid_club = club_id
        AND activo = true
    );
$$;

COMMENT ON FUNCTION public.user_belongs_to_club IS 'Verifica si el usuario pertenece a un club específico';

-- Function: Mark guest as checked in
CREATE OR REPLACE FUNCTION public.mark_invitado_ingresado(invitado_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role user_role;
    invitado_club UUID;
    user_club UUID;
BEGIN
    -- Get user role and club
    SELECT rol, uuid_club INTO user_role, user_club
    FROM public.personal
    WHERE id = auth.uid() AND activo = true;
    
    -- Check if user is seguridad
    IF user_role != 'seguridad' THEN
        RAISE EXCEPTION 'Solo el personal de seguridad puede marcar ingresos';
    END IF;
    
    -- Get invitado's club through evento
    SELECT e.uuid_club INTO invitado_club
    FROM public.invitados i
    JOIN public.eventos e ON i.uuid_evento = e.id
    WHERE i.id = invitado_id;
    
    -- Check if invitado belongs to user's club
    IF invitado_club != user_club THEN
        RAISE EXCEPTION 'No puedes marcar invitados de otro club';
    END IF;
    
    -- Update invitado
    UPDATE public.invitados
    SET 
        ingresado = true,
        fecha_ingreso = NOW(),
        updated_at = NOW()
    WHERE id = invitado_id;
    
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.mark_invitado_ingresado IS 'Marca un invitado como ingresado (solo seguridad)';

-- Function: Get evento club
CREATE OR REPLACE FUNCTION public.get_evento_club(evento_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT uuid_club 
    FROM public.eventos 
    WHERE id = evento_id;
$$;

COMMENT ON FUNCTION public.get_evento_club IS 'Retorna el uuid_club de un evento';
