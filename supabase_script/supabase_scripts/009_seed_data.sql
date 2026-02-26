-- =============================================
-- Migration: 009 - Seed Data (Optional)
-- Description: Sample data for testing
-- =============================================

-- NOTE: This is optional and for development/testing only
-- Comment out or delete in production

-- Insert sample clubs
INSERT INTO public.clubs (id, nombre, activo) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Club Central', true),
    ('22222222-2222-2222-2222-222222222222', 'Club Norte', true),
    ('33333333-3333-3333-3333-333333333333', 'Club Sur', false);

-- NOTE: Personal records should be created AFTER users are registered via Supabase Auth
-- Example of how to insert personal after auth signup:
-- 
-- INSERT INTO public.personal (id, nombre, apellido, edad, ubicacion, rol, uuid_club)
-- VALUES 
--     ('auth-user-uuid-1', 'Carlos', 'Admin', 35, 'Buenos Aires', 'admin', '11111111-1111-1111-1111-111111111111'),
--     ('auth-user-uuid-2', 'María', 'RRPP', 28, 'Córdoba', 'rrpp', '11111111-1111-1111-1111-111111111111'),
--     ('auth-user-uuid-3', 'Juan', 'Seguridad', 32, 'Rosario', 'seguridad', '11111111-1111-1111-1111-111111111111');

-- Example eventos (created by admin)
-- INSERT INTO public.eventos (nombre, fecha, uuid_club, estado, created_by)
-- VALUES
--     ('Evento de Verano 2025', '2025-02-15 22:00:00', '11111111-1111-1111-1111-111111111111', true, 'admin-user-uuid'),
--     ('Fiesta de Año Nuevo', '2025-12-31 23:00:00', '11111111-1111-1111-1111-111111111111', true, 'admin-user-uuid');

-- Data seeding complete
