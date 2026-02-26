-- =============================================
-- Migration: 054 - Update check_cliente_denegado function
-- Description: Add pais and provincia to the return type
-- =============================================

-- Drop existing function
DROP FUNCTION IF EXISTS check_cliente_denegado(TEXT);

-- Recreate with pais and provincia fields
CREATE OR REPLACE FUNCTION check_cliente_denegado(p_dni TEXT)
RETURNS TABLE (
  existe BOOLEAN,
  denegado BOOLEAN,
  cliente_id UUID,
  nombre TEXT,
  apellido TEXT,
  edad INTEGER,
  sexo TEXT,
  pais TEXT,
  provincia TEXT,
  departamento TEXT,
  localidad TEXT,
  denegado_razon TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS existe,
    c.denegado,
    c.id AS cliente_id,
    c.nombre,
    c.apellido,
    c.edad,
    c.sexo::TEXT,
    c.pais,
    c.provincia,
    c.departamento,
    c.localidad,
    c.denegado_razon
  FROM clientes c
  WHERE c.dni = p_dni;

  -- If no rows returned, return a "not found" row
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE AS existe,
      FALSE AS denegado,
      NULL::UUID AS cliente_id,
      NULL::TEXT AS nombre,
      NULL::TEXT AS apellido,
      NULL::INTEGER AS edad,
      NULL::TEXT AS sexo,
      NULL::TEXT AS pais,
      NULL::TEXT AS provincia,
      NULL::TEXT AS departamento,
      NULL::TEXT AS localidad,
      NULL::TEXT AS denegado_razon;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_cliente_denegado(TEXT) TO authenticated;

COMMENT ON FUNCTION check_cliente_denegado IS 'Check if a client exists by DNI and if they are denied entry. Returns full location hierarchy including pais and provincia.';
