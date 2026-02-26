-- =============================================
-- Migration: 019 - Add Iguazú Localidades
-- Description: Add additional localities for Iguazú department
-- Dependencies: 017_create_ubicaciones.sql
-- Version: 1.0 (Consolidated from 027_add_iguazu_localidades.sql)
-- =============================================

-- Add additional Iguazú localities that were missing
INSERT INTO public.ubicaciones (departamento, localidad) VALUES
('Iguazú', 'Wanda'),
('Iguazú', 'Comandante Andresito'),
('Iguazú', 'Colonia Delicia'),
('Iguazú', 'Puerto Libertad')
ON CONFLICT DO NOTHING;

-- Verification query (optional - for logs)
DO $$
DECLARE
    total_iguazu INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO total_iguazu
    FROM public.ubicaciones
    WHERE departamento = 'Iguazú';

    RAISE NOTICE 'Total de localidades en Iguazú: %', total_iguazu;
END $$;
