-- =============================================
-- Migration: 024 - Create Auth Logs
-- Description: Tabla para auditoría de intentos de login
-- Dependencies: 003_create_personal.sql
-- Version: 1.0 (Consolidated from 036_create_auth_logs.sql)
-- =============================================

-- Create auth_logs table
CREATE TABLE IF NOT EXISTS public.auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('login_success', 'login_failed', 'logout')),
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON public.auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON public.auth_logs(action);

-- Add comment
COMMENT ON TABLE public.auth_logs IS 'Registro de auditoría de intentos de autenticación';
COMMENT ON COLUMN public.auth_logs.action IS 'Tipo de acción: login_success, login_failed, logout';

-- Enable RLS
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Solo admins pueden ver los logs
CREATE POLICY "Only admins can view auth logs"
ON public.auth_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.personal
        WHERE id = auth.uid()
        AND rol = 'admin'
        AND activo = true
    )
);

-- Function to clean old logs (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.auth_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_auth_logs IS 'Limpia logs de autenticación más antiguos de 90 días';

-- Create function to log authentication attempts
CREATE OR REPLACE FUNCTION public.log_auth_attempt(
    p_user_id UUID,
    p_email TEXT,
    p_action TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.auth_logs (
        user_id,
        email,
        action,
        ip_address,
        user_agent,
        error_message
    )
    VALUES (
        p_user_id,
        p_email,
        p_action,
        p_ip_address,
        p_user_agent,
        p_error_message
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_auth_attempt IS 'Registra un intento de autenticación en auth_logs';

-- Function to check failed login attempts in last N minutes
CREATE OR REPLACE FUNCTION public.get_failed_login_attempts(
    p_email TEXT,
    p_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM public.auth_logs
    WHERE email = p_email
    AND action = 'login_failed'
    AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.get_failed_login_attempts IS 'Retorna el número de intentos fallidos de login en los últimos N minutos';
