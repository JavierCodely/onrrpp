-- =============================================
-- Migration: 027 - Add Missing Iguazú Localities
-- Description: Add Puerto Wanda and Puerto Libertad to Iguazú department
-- =============================================

-- Insert missing localities for Iguazú department
INSERT INTO ubicaciones (departamento, localidad) 
VALUES 
  ('Iguazú', 'Puerto Wanda'),
  ('Iguazú', 'Puerto Libertad')
ON CONFLICT DO NOTHING;

-- Verify the Iguazú localities
-- SELECT departamento, localidad FROM ubicaciones WHERE departamento = 'Iguazú' ORDER BY localidad;

COMMENT ON TABLE ubicaciones IS 'Departamentos y localidades de Misiones, Argentina - Updated with complete Iguazú localities';

