-- =============================================
-- Migration: 052 - Add pais and provincia to invitados and clientes
-- Description: Add country and province fields to support hierarchical locations
-- =============================================

-- =============================================
-- INVITADOS TABLE
-- =============================================

-- Add new columns with defaults (existing data is Misiones, Argentina)
ALTER TABLE invitados ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Argentina';
ALTER TABLE invitados ADD COLUMN IF NOT EXISTS provincia TEXT DEFAULT 'Misiones';

-- Migrate existing data
UPDATE invitados SET pais = 'Argentina', provincia = 'Misiones' WHERE pais IS NULL;

-- Add indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_invitados_pais ON invitados(pais);
CREATE INDEX IF NOT EXISTS idx_invitados_provincia ON invitados(provincia);
CREATE INDEX IF NOT EXISTS idx_invitados_pais_provincia ON invitados(pais, provincia);

-- Comments
COMMENT ON COLUMN invitados.pais IS 'Country of the guest (e.g., Argentina, Brasil, Paraguay)';
COMMENT ON COLUMN invitados.provincia IS 'Province/State of the guest (e.g., Misiones, Parana)';

-- =============================================
-- CLIENTES TABLE
-- =============================================

-- Add new columns with defaults (existing data is Misiones, Argentina)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Argentina';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS provincia TEXT DEFAULT 'Misiones';

-- Migrate existing data
UPDATE clientes SET pais = 'Argentina', provincia = 'Misiones' WHERE pais IS NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_clientes_pais ON clientes(pais);
CREATE INDEX IF NOT EXISTS idx_clientes_provincia ON clientes(provincia);
CREATE INDEX IF NOT EXISTS idx_clientes_pais_provincia ON clientes(pais, provincia);

-- Comments
COMMENT ON COLUMN clientes.pais IS 'Country of the client (e.g., Argentina, Brasil, Paraguay)';
COMMENT ON COLUMN clientes.provincia IS 'Province/State of the client (e.g., Misiones, Parana)';
