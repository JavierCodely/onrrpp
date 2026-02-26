-- =============================================
-- Migration: 013 - Create Ubicaciones (Locations)
-- Description: Create table for Misiones departments and localities
-- =============================================

-- Create ubicaciones table
CREATE TABLE IF NOT EXISTS ubicaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  departamento TEXT NOT NULL,
  localidad TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster autocomplete queries
CREATE INDEX idx_ubicaciones_departamento ON ubicaciones (departamento);
CREATE INDEX idx_ubicaciones_localidad ON ubicaciones (localidad);
CREATE INDEX idx_ubicaciones_departamento_lower ON ubicaciones (LOWER(departamento));
CREATE INDEX idx_ubicaciones_localidad_lower ON ubicaciones (LOWER(localidad));

-- Add updated_at trigger
CREATE TRIGGER update_ubicaciones_updated_at
  BEFORE UPDATE ON ubicaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert data from lugares.txt
INSERT INTO ubicaciones (departamento, localidad) VALUES
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
('Veinticinco de Mayo', 'Veinticinco de Mayo');

-- Add comment
COMMENT ON TABLE ubicaciones IS 'Departamentos y localidades de Misiones, Argentina';
