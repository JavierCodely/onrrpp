-- =============================================
-- Migration: 051 - Add pais and provincia to ubicaciones
-- Description: Expand ubicaciones table to support hierarchical locations
--              (Country -> Province -> Department -> Locality)
-- =============================================

-- Add new columns with defaults
ALTER TABLE ubicaciones ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Argentina';
ALTER TABLE ubicaciones ADD COLUMN IF NOT EXISTS provincia TEXT DEFAULT 'Misiones';

-- Migrate existing data (all current data is Misiones, Argentina)
UPDATE ubicaciones SET pais = 'Argentina', provincia = 'Misiones' WHERE pais IS NULL OR provincia IS NULL;

-- Make columns NOT NULL after data migration
ALTER TABLE ubicaciones ALTER COLUMN pais SET NOT NULL;
ALTER TABLE ubicaciones ALTER COLUMN provincia SET NOT NULL;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ubicaciones_pais ON ubicaciones(pais);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_provincia ON ubicaciones(provincia);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_pais_provincia ON ubicaciones(pais, provincia);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_pais_provincia_departamento ON ubicaciones(pais, provincia, departamento);

-- Add composite unique constraint to avoid duplicates
ALTER TABLE ubicaciones ADD CONSTRAINT unique_ubicacion_completa
  UNIQUE (pais, provincia, departamento, localidad);

-- Update table comment
COMMENT ON TABLE ubicaciones IS 'Hierarchical location catalog: Country -> Province -> Department -> Locality. Supports Argentina, Brasil, and Paraguay.';
COMMENT ON COLUMN ubicaciones.pais IS 'Country name (e.g., Argentina, Brasil, Paraguay)';
COMMENT ON COLUMN ubicaciones.provincia IS 'Province/State name (e.g., Misiones, Parana, Alto Parana)';
COMMENT ON COLUMN ubicaciones.departamento IS 'Department/Municipality name';
COMMENT ON COLUMN ubicaciones.localidad IS 'City/Town name';
