-- Verificar el grupo del usuario Admin actual
SELECT 
  id, 
  nombre, 
  apellido, 
  rol, 
  grupo,
  email
FROM public.personal 
WHERE rol = 'admin' 
  AND activo = true
LIMIT 5;
