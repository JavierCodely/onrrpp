-- =============================================
-- Migration: 017 - Create Ubicaciones (Locations)
-- Description: Create table for Argentina departments and localities (Misiones province)
-- Dependencies: None
-- Version: 1.0 (Consolidated from 013_create_ubicaciones.sql)
-- =============================================

-- Create ubicaciones table
CREATE TABLE IF NOT EXISTS public.ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  localidad TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster autocomplete queries
CREATE INDEX IF NOT EXISTS idx_ubicaciones_departamento ON public.ubicaciones (departamento);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_localidad ON public.ubicaciones (localidad);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_departamento_lower ON public.ubicaciones (LOWER(departamento));
CREATE INDEX IF NOT EXISTS idx_ubicaciones_localidad_lower ON public.ubicaciones (LOWER(localidad));

-- Add updated_at trigger
CREATE TRIGGER update_ubicaciones_updated_at
  BEFORE UPDATE ON public.ubicaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert data from lugares.txt (Misiones, Argentina)
INSERT INTO public.ubicaciones (departamento, localidad) VALUES
-- Departamento Capital
('Capital', 'Posadas'),

-- Departamento Apóstoles
('Apóstoles', 'Apóstoles'),

-- Departamento Cainguás
('Cainguás', 'Campo Grande'),

-- Departamento Candelaria
('Candelaria', 'Candelaria'),

-- Departamento Concepción de la Sierra
('Concepción de la Sierra', 'Concepción de la Sierra'),

-- Departamento Eldorado
('Eldorado', 'Eldorado'),

-- Departamento General Manuel Belgrano
('General Manuel Belgrano', 'Bernardo de Irigoyen'),

-- Departamento Guaraní
('Guaraní', 'San Vicente'),

-- Departamento Iguazú
('Iguazú', 'Puerto Esperanza'),
('Iguazú', 'Puerto Iguazú'),

-- Departamento Leandro N. Alem
('Leandro N. Alem', 'Leandro N. Alem'),
('Leandro N. Alem', 'Cerro Azul'),

-- Departamento Libertador General San Martín
('Libertador General San Martín', 'Puerto Rico'),
('Libertador General San Martín', 'Capioví'),

-- Departamento Montecarlo
('Montecarlo', 'Montecarlo'),
('Montecarlo', 'Caraguatay'),

-- Departamento Oberá
('Oberá', 'Oberá'),

-- Departamento San Ignacio
('San Ignacio', 'San Ignacio'),
('San Ignacio', 'Jardín América'),

-- Departamento San Javier
('San Javier', 'San Javier'),

-- Departamento San Pedro
('San Pedro', 'San Pedro'),

-- Departamento Veinticinco de Mayo
('Veinticinco de Mayo', 'Veinticinco de Mayo')

ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.ubicaciones IS 'Departamentos y localidades de Misiones, Argentina';
COMMENT ON COLUMN public.ubicaciones.departamento IS 'Nombre del departamento (municipio)';
COMMENT ON COLUMN public.ubicaciones.localidad IS 'Nombre de la localidad';
