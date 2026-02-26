# Checklist de Deployment - Sistema de Mesas

## Estado Actual

**Frontend**: COMPLETO y compilado exitosamente
**Backend**: PENDIENTE (ejecutar migraciones SQL)

## Pasos para Activar el Sistema

### Paso 1: Ejecutar Migraciones SQL (CRÍTICO)

Ir a Supabase Dashboard → SQL Editor y ejecutar EN ORDEN:

1. **062_create_sectores_table.sql**
   - Crea tabla `sectores`
   - Campos: nombre, imagen_url, uuid_evento
   - RLS policies por uuid_club

2. **063_create_mesas_table.sql**
   - Crea tabla `mesas`
   - Campos: numero, capacidad, precio, comision_rrpp, consumicion_minima, posicion_x, posicion_y, estado
   - Check constraints: estado IN ('libre', 'reservado', 'vendido')
   - Unique constraint: (numero, uuid_sector)

3. **064_create_mesas_ventas.sql**
   - Crea tabla `mesas_ventas`
   - Campos: uuid_mesa, id_rrpp, cliente (nombre, apellido, DNI, teléfono, email), cantidad_personas, precio_final, comision_rrpp, qr_code
   - Campos entrega: consumicion_entregada, fecha_entrega_consumicion, id_bartender_entrega

4. **065_create_mesas_triggers.sql**
   - Trigger: prevent_edit_sold_mesa (impide editar mesa vendida)
   - Trigger: validate_mesa_position (valida coordenadas 0-100)
   - Trigger: update_updated_at_mesas
   - Trigger: generate_qr_venta_mesa (genera QR único)

5. **066_create_mesas_functions.sql**
   - RPC: `reservar_mesa(p_uuid_mesa)`
   - RPC: `vender_mesa(p_uuid_mesa, datos_cliente...)`
   - RPC: `cancelar_reserva_mesa(p_uuid_mesa)`
   - RPC: `entregar_consumicion_mesa(p_qr_code)`

6. **067_create_sectores_images_bucket.sql**
   - Crea storage bucket `sectores-images`
   - Políticas: public SELECT, authenticated INSERT/UPDATE

7. **068_create_sectores_seguridad_assignment.sql**
   - Crea tabla `sectores_seguridad_asignaciones`
   - Asignación many-to-many de seguridad a sectores
   - Trigger: prevent_duplicate_assignment

### Paso 2: Verificar Storage Bucket

En Supabase Dashboard → Storage:

- [ ] Bucket `sectores-images` existe
- [ ] Bucket es público (public: true)
- [ ] Políticas de acceso:
  ```sql
  -- SELECT: público
  CREATE POLICY "Public can view sectores images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sectores-images');

  -- INSERT: solo autenticados
  CREATE POLICY "Authenticated can upload sectores images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sectores-images' AND
    auth.role() = 'authenticated'
  );

  -- DELETE: solo autenticados
  CREATE POLICY "Authenticated can delete sectores images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sectores-images' AND
    auth.role() = 'authenticated'
  );
  ```

### Paso 3: Verificar Tipos de Usuario

En Supabase Dashboard → Database → Tables → personal:

- [ ] Enum `user_role` incluye 'bartender'
  ```sql
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bartender';
  ```

### Paso 4: Crear Usuario Bartender de Prueba (Opcional)

```sql
-- Opción A: Actualizar usuario existente
UPDATE personal
SET rol = 'bartender'
WHERE email = 'bartender@test.com';

-- Opción B: Crear nuevo usuario
-- 1. Crear en Auth Dashboard primero
-- 2. Luego insertar en personal:
INSERT INTO personal (
  id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club, activo
) VALUES (
  'auth-uuid-del-paso-1',
  'Juan',
  'Bartender',
  25,
  'hombre',
  'Buenos Aires',
  'bartender',
  'uuid-del-club',
  true
);
```

### Paso 5: Testing Local

```bash
# Terminal 1: Iniciar dev server
npm run dev

# Abrir http://localhost:5173
```

#### Test Admin
1. Login como admin
2. Ir a "Sectores" en menú lateral
3. Seleccionar evento activo
4. Click "Nuevo Sector"
5. Subir imagen 1080x1920 (validar rechazo si dimensiones incorrectas)
6. Crear sector
7. Ir a "Mesas" en menú lateral
8. Seleccionar evento → sector
9. Click "Nueva Mesa" o click en mapa
10. Crear mesa con:
    - Número: 1
    - Capacidad: 4
    - Precio: 5000
    - Comisión: 15
    - Consumición: 2000
    - Posición: 50, 50
11. Arrastrar mesa en mapa → verificar que se actualiza posición
12. Crear 3-4 mesas más

#### Test RRPP
1. Login como rrpp
2. Bottom navigation → click "Mesas" (nuevo botón)
3. Seleccionar evento
4. Seleccionar sector
5. Ver mapa con mesas en colores
6. Click en mesa VERDE (libre)
7. Ver detalles
8. Click "Reservar Mesa"
9. Verificar que cambia a AMARILLO
10. Click en mesa AMARILLA
11. Click "Confirmar Venta"
12. Completar formulario:
    - Nombre: Juan
    - Apellido: Pérez
    - DNI: 12345678
    - Teléfono: +54 9 11 1234-5678
    - Email: juan@test.com
    - Personas: 4
13. Click "Confirmar Venta"
14. Ver QR generado
15. Tomar screenshot del QR
16. Verificar mesa cambió a ROJO
17. Click en mesa roja → "Ver Código QR"

#### Test Bartender
1. Login como bartender
2. Auto-redirige a /scanner
3. Permitir acceso a cámara
4. Mostrar QR del paso RRPP (screenshot o desde otra pantalla)
5. Escanear QR
6. Verificar:
   - Toast "Consumición entregada"
   - Card verde con éxito
   - Información de venta mostrada
   - Contador 3s antes de permitir nuevo escaneo
7. Intentar escanear mismo QR nuevamente
8. Verificar rechazo: "Consumición ya entregada"
9. Bottom navigation → "Historial"
10. Verificar entrega aparece en lista
11. Verificar estadísticas correctas

### Paso 6: Verificar Realtime

1. Abrir dos ventanas:
   - Ventana A: Admin en MesasAdminPage
   - Ventana B: RRPP en MesasRRPPPage
2. Ventana B: Vender una mesa
3. Ventana A: Verificar que mesa cambia a rojo instantáneamente
4. Ventana A: Arrastrar mesa
5. Ventana B: Verificar que posición se actualiza

### Paso 7: Testing de Errores

- [ ] Subir imagen 1920x1080 (horizontal) → debe rechazar
- [ ] Subir imagen 500x500 → debe rechazar
- [ ] Crear mesa con número duplicado → debe rechazar (DB)
- [ ] Eliminar mesa vendida → debe rechazar (DB)
- [ ] Vender mesa ya vendida → debe rechazar (DB)
- [ ] Escanear QR inválido → debe rechazar
- [ ] Escanear QR de otra mesa dos veces → debe rechazar

## Troubleshooting

### Error: "relation 'sectores' does not exist"
**Solución**: Ejecutar migración 062

### Error: "bucket 'sectores-images' does not exist"
**Solución**: Ejecutar migración 067 o crear manualmente en Storage

### Error: "function 'vender_mesa' does not exist"
**Solución**: Ejecutar migración 066

### Error: Imagen se sube pero no se ve
**Solución**: Verificar políticas de storage (SELECT público)

### Error: Realtime no funciona
**Solución**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sectores;
ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
ALTER PUBLICATION supabase_realtime ADD TABLE mesas_ventas;
```

### Error: "Permission denied" al reservar/vender
**Solución**: Verificar RLS policies permiten INSERT/UPDATE para RRPP

### Error: Drag & drop no mueve mesa
**Solución**: Verificar que container tiene `id="sector-map-container"`

### Error: Cámara no inicia en bartender
**Solución**:
- Verificar HTTPS habilitado (Vite con @vitejs/plugin-basic-ssl)
- Verificar permisos de cámara en navegador
- Verificar html5-qrcode instalado: `npm i html5-qrcode`

## Métricas de Éxito

Una vez deployado, verificar:

- [ ] Admin puede crear sectores en < 30 segundos
- [ ] Admin puede posicionar 10 mesas en < 2 minutos
- [ ] RRPP puede vender mesa en < 1 minuto
- [ ] Bartender puede escanear QR en < 5 segundos
- [ ] Realtime actualiza en < 2 segundos
- [ ] App responde rápido en 4G mobile
- [ ] No hay errores en consola del navegador
- [ ] Build size < 2MB total

## Rollback Plan

Si algo falla después de deployment:

1. **Frontend**:
   ```bash
   git checkout HEAD~1  # Volver a commit anterior
   npm run build
   ```

2. **Backend**: Ejecutar rollback SQL
   ```sql
   DROP TABLE IF EXISTS mesas_ventas CASCADE;
   DROP TABLE IF EXISTS mesas CASCADE;
   DROP TABLE IF EXISTS sectores_seguridad_asignaciones CASCADE;
   DROP TABLE IF EXISTS sectores CASCADE;
   DROP FUNCTION IF EXISTS reservar_mesa CASCADE;
   DROP FUNCTION IF EXISTS vender_mesa CASCADE;
   DROP FUNCTION IF EXISTS cancelar_reserva_mesa CASCADE;
   DROP FUNCTION IF EXISTS entregar_consumicion_mesa CASCADE;
   ```

3. **Storage**: Eliminar bucket `sectores-images` manualmente

## Documentación de Referencia

- **Implementación completa**: `MESAS_FRONTEND_IMPLEMENTATION.md`
- **Arquitectura y flujos**: `MESAS_ARCHITECTURE.md`
- **Lista de archivos**: `MESAS_FILES_SUMMARY.md`
- **Frontend patterns**: `FRONTEND_GUIDE.md` (original)
- **Database schema**: `supabase/README.md`

## Contacto y Soporte

Para problemas técnicos:
1. Revisar console del navegador (F12)
2. Revisar logs de Supabase Dashboard
3. Verificar migraciones ejecutadas correctamente
4. Revisar este checklist paso a paso

## Conclusión

Todo el frontend está implementado y compilado sin errores.
Ejecutar migraciones SQL y comenzar testing.
Sistema listo para producción una vez validado el flujo completo.

**Tiempo estimado de deployment completo**: 30-45 minutos
- Migraciones SQL: 10 minutos
- Testing básico: 15 minutos
- Testing completo: 20 minutos

---

**Generado**: 2026-01-29
**Build Status**: SUCCESS
**TypeScript Errors**: 0
**Archivos Creados**: 21
**Archivos Modificados**: 8
