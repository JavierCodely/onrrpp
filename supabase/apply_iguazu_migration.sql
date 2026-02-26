-- =============================================
-- Script to manually add Iguazú localities
-- Execute this in Supabase SQL Editor if needed
-- =============================================

-- Insert missing localities for Iguazú department
INSERT INTO ubicaciones (departamento, localidad) 
VALUES 
  ('Iguazú', 'Puerto Wanda'),
  ('Iguazú', 'Puerto Libertad')
ON CONFLICT DO NOTHING;

-- Verify all Iguazú localities
SELECT 
  departamento, 
  localidad,
  created_at
FROM ubicaciones 
WHERE departamento = 'Iguazú' 
ORDER BY localidad;

-- Expected result:
-- departamento | localidad
-- -------------+------------------
-- Iguazú       | Puerto Esperanza
-- Iguazú       | Puerto Iguazú
-- Iguazú       | Puerto Libertad
-- Iguazú       | Puerto Wanda

