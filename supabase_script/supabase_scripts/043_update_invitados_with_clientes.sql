-- =============================================
-- Migration: 043 - Update Invitados to Reference Clientes
-- Description: Add uuid_cliente FK and remove redundant fields from invitados
-- Dependencies: 042_create_clientes_table.sql
-- Version: 1.0
-- =============================================

-- Step 1: Add uuid_cliente column to invitados
ALTER TABLE public.invitados
ADD COLUMN IF NOT EXISTS uuid_cliente UUID REFERENCES public.clientes(id) ON DELETE CASCADE;

-- Step 2: Create index for uuid_cliente
CREATE INDEX IF NOT EXISTS idx_invitados_uuid_cliente ON public.invitados(uuid_cliente);

-- Step 3: Add unique constraint to prevent duplicate entries (same cliente + same lote)
-- A cliente can only have ONE entry per lote
ALTER TABLE public.invitados
ADD CONSTRAINT cliente_lote_unico UNIQUE (uuid_cliente, uuid_lote);

-- Add comment
COMMENT ON COLUMN public.invitados.uuid_cliente IS 'Cliente asociado al invitado';
COMMENT ON CONSTRAINT cliente_lote_unico ON public.invitados IS 'Un cliente solo puede tener una entrada por lote';

-- Step 4: Drop redundant columns that are now in clientes table
-- IMPORTANTE: Ejecutar este paso solo después de migrar los datos existentes a clientes
-- Por ahora, los dejamos para que el trigger pueda poblar la tabla clientes

-- Las siguientes líneas se descomentarán DESPUÉS de ejecutar la migración de datos
-- y confirmar que todo funciona correctamente:

/*
ALTER TABLE public.invitados
DROP COLUMN IF EXISTS nombre,
DROP COLUMN IF EXISTS apellido,
DROP COLUMN IF EXISTS edad,
DROP COLUMN IF EXISTS sexo,
DROP COLUMN IF EXISTS departamento,
DROP COLUMN IF EXISTS localidad,
DROP COLUMN IF EXISTS dni;
*/

-- NOTA: Por ahora mantenemos estos campos para compatibilidad durante la transición
-- Se eliminarán en una migración posterior una vez que todo el sistema use uuid_cliente
