# FRONTEND GUIDE - Sistema de Mesas (Parte 2)

**Continuación de FRONTEND_GUIDE.md**

---

## 7. REALTIME SUBSCRIPTIONS

### Patrón General de Realtime

Todas las tablas del sistema de mesas tienen realtime habilitado. Usa el siguiente patrón consistente:

```typescript
useEffect(() => {
  if (!eventoId) return

  const channel = supabase
    .channel(`tabla-${eventoId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT | UPDATE | DELETE | *
        schema: 'public',
        table: 'nombre_tabla',
        filter: `uuid_evento=eq.${eventoId}` // Filtro opcional
      },
      (payload: RealtimePostgresChangesPayload<TipoTabla>) => {
        console.log('📡 Realtime: nombre_tabla change', payload)

        // Opción 1: Recargar completamente
        loadData()

        // Opción 2: Actualizar solo el registro cambiado
        if (payload.eventType === 'INSERT') {
          setData(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => prev.map(item =>
            item.id === payload.new.id ? payload.new : item
          ))
        } else if (payload.eventType === 'DELETE') {
          setData(prev => prev.filter(item => item.id !== payload.old.id))
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Estado de suscripción:', status)
    })

  return () => {
    console.log('🔌 Desuscribiendo de canal')
    supabase.removeChannel(channel)
  }
}, [eventoId])
```

### 7.1. Realtime para Sectores

```typescript
// En SectoresPage.tsx o useSectores hook
useEffect(() => {
  if (!eventoId) return

  const channel = supabase
    .channel(`sectores-${eventoId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sectores',
        filter: `uuid_evento=eq.${eventoId}`
      },
      (payload: RealtimePostgresChangesPayload<Sector>) => {
        console.log('📡 Realtime: sectores change', payload)
        loadSectores()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [eventoId])
```

### 7.2. Realtime para Mesas

```typescript
// En MesasAdminPage.tsx o useMesas hook
useEffect(() => {
  if (!sectorId) return

  const channel = supabase
    .channel(`mesas-${sectorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mesas',
        filter: `uuid_sector=eq.${sectorId}`
      },
      (payload: RealtimePostgresChangesPayload<Mesa>) => {
        console.log('📡 Realtime: mesas change', payload)

        // Actualizar mesa específica (más eficiente que recargar todo)
        if (payload.eventType === 'UPDATE') {
          setMesas(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
        } else {
          loadMesas()
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [sectorId])
```

### 7.3. Realtime para Ventas de Mesas

```typescript
// En VentasMesasRRPPPage.tsx
useEffect(() => {
  if (!user || !eventoId) return

  const channel = supabase
    .channel(`ventas-mesas-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ventas_mesas',
        filter: `id_rrpp=eq.${user.id}`
      },
      (payload: RealtimePostgresChangesPayload<VentaMesa>) => {
        console.log('📡 Nueva venta de mesa', payload)
        toast.success('Nueva venta registrada', {
          description: `Mesa vendida: ${payload.new.cliente_nombre || payload.new.cliente_dni}`
        })
        loadVentasMesas()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [user, eventoId])
```

### 7.4. Realtime para Escaneos (Seguridad/Bartender)

```typescript
// En MesasRRPPPage.tsx - para que el RRPP vea actualizaciones en tiempo real
useEffect(() => {
  if (!user || !selectedSector) return

  const channel = supabase
    .channel(`escaneos-mesas-${selectedSector}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'escaneos_mesas',
        // Sin filtro porque queremos ver todos los escaneos del sector
      },
      (payload: RealtimePostgresChangesPayload<EscaneoMesa>) => {
        console.log('📡 Nuevo escaneo de mesa', payload)

        // Actualizar el contador de escaneos de la mesa
        setMesas(prev => prev.map(m =>
          m.id === payload.new.uuid_mesa
            ? { ...m, escaneos_seguridad_count: m.escaneos_seguridad_count + 1 }
            : m
        ))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [user, selectedSector])
```

---

## 8. VALIDACIONES FRONTEND

### 8.1. Validación de Imagen 1080x1920

Utilizada en `sectoresService.uploadSectorImage()`:

```typescript
/**
 * Validate image dimensions before upload
 */
private validateImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen'))
    }

    img.src = objectUrl
  })
}

// Uso en upload:
const dimensions = await this.validateImageDimensions(file)
if (dimensions.width !== 1080 || dimensions.height !== 1920) {
  throw new Error(`La imagen debe ser de 1080x1920 píxeles. Imagen actual: ${dimensions.width}x${dimensions.height}`)
}
```

**Uso en componente:**

```typescript
// En SectorFormDialog.tsx
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    toast.error('El archivo debe ser una imagen')
    return
  }

  // Validar tamaño (10MB máximo)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('La imagen no debe superar los 10MB')
    return
  }

  try {
    // Validar dimensiones
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      if (img.width !== 1080 || img.height !== 1920) {
        toast.error('Dimensiones incorrectas', {
          description: `La imagen debe ser de 1080x1920 píxeles. Tu imagen es ${img.width}x${img.height}px`
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // Imagen válida
      setSelectedFile(file)
      setPreviewUrl(objectUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      toast.error('No se pudo cargar la imagen')
    }

    img.src = objectUrl
  } catch (error) {
    toast.error('Error al validar imagen')
  }
}
```

### 8.2. Validación de DNI

Validación básica antes de venta:

```typescript
// En VenderMesaDialog.tsx
const validateDNI = (dni: string): boolean => {
  // Remover espacios
  const dniClean = dni.trim().replace(/\s/g, '')

  // Validar que sea solo números
  if (!/^\d+$/.test(dniClean)) {
    toast.error('DNI inválido', {
      description: 'El DNI debe contener solo números'
    })
    return false
  }

  // Validar longitud (7-8 dígitos en Argentina)
  if (dniClean.length < 7 || dniClean.length > 8) {
    toast.error('DNI inválido', {
      description: 'El DNI debe tener entre 7 y 8 dígitos'
    })
    return false
  }

  return true
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!validateDNI(formData.dni)) {
    return
  }

  // Proceder con la venta...
}
```

### 8.3. Validación de Estados de Mesa

Validaciones antes de acciones:

```typescript
// En useMesaInteraction.ts o componente
const validateMesaAction = (
  mesa: Mesa,
  action: 'reservar' | 'vender' | 'liberar'
): { valid: boolean; error?: string } => {
  // Validar RESERVAR
  if (action === 'reservar') {
    if (mesa.estado !== 'libre') {
      return {
        valid: false,
        error: 'La mesa no está libre'
      }
    }
  }

  // Validar VENDER
  if (action === 'vender') {
    if (mesa.estado === 'vendido') {
      return {
        valid: false,
        error: 'La mesa ya está vendida'
      }
    }
    // Puede vender desde 'libre' o 'reservado'
  }

  // Validar LIBERAR
  if (action === 'liberar') {
    if (mesa.estado !== 'reservado') {
      return {
        valid: false,
        error: 'Solo se pueden liberar mesas reservadas'
      }
    }
    if (mesa.id_rrpp !== user?.id) {
      return {
        valid: false,
        error: 'Solo puedes liberar tus propias reservas'
      }
    }
  }

  return { valid: true }
}

// Uso:
const handleReservar = async (mesa: Mesa) => {
  const validation = validateMesaAction(mesa, 'reservar')
  if (!validation.valid) {
    toast.error('No se puede reservar', {
      description: validation.error
    })
    return
  }

  await reservarMesa(mesa.id)
}
```

### 8.4. Validación de Coordenadas

Al posicionar mesas en el editor:

```typescript
// En SectorMapEditor.tsx
const validateCoordinates = (x: number, y: number): boolean => {
  // Las coordenadas deben estar entre 0 y 100 (porcentaje)
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    toast.error('Coordenadas inválidas', {
      description: 'La mesa debe estar dentro del área del sector'
    })
    return false
  }

  return true
}

const handleDragEnd = (mesaId: string, x: number, y: number) => {
  if (!validateCoordinates(x, y)) {
    // Revertir posición
    loadMesas()
    return
  }

  // Guardar posición
  mesasService.updateMesa(mesaId, {
    coordenada_x: x,
    coordenada_y: y
  })
}
```

---

## 9. SHADCN/UI COMPONENTES

### Componentes Necesarios

Instala los siguientes componentes de shadcn/ui si no los tienes:

```bash
# Componentes básicos
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add checkbox

# Componentes avanzados
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add separator
```

### Componentes Específicos por Página

**Admin - SectoresPage:**
- Button, Card, Dialog, Input, Label, Table, Badge, AlertDialog

**Admin - MesasAdminPage:**
- Button, Card, Dialog, Input, Label, Badge, Select

**RRPP - MesasRRPPPage:**
- Button, Card, Dialog, Badge, Tabs, ScrollArea

**Seguridad - ScannerMesasPage:**
- Card, Button, Badge (usa el scanner existente de ScannerPage.tsx)

**Bartender - BartenderScannerPage:**
- Card, Button, Badge, Dialog, AlertDialog

### Patrones de Uso Mobile-First

```typescript
// Responsive dialog con scroll
<Dialog>
  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
    {/* Contenido */}
  </DialogContent>
</Dialog>

// Botones fixed en mobile
<DialogFooter className="fixed bottom-5 left-0 right-0 p-4 bg-background border-t md:relative md:border-0">
  <Button className="w-full">Guardar</Button>
</DialogFooter>

// SelectContent con scroll
<Select>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="max-h-[40vh] overflow-y-auto">
    {items.map(item => (
      <SelectItem key={item.id} value={item.id}>
        {item.nombre}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>

// Safe area para notch
<nav className="fixed bottom-0 left-0 right-0 pb-safe">
  {/* Navegación */}
</nav>
```

---

## 10. ORDEN DE IMPLEMENTACIÓN

### Checklist de Implementación Sugerido

#### Fase 1: Backend (Scripts SQL)
- [ ] Ejecutar `061_create_bartender_role.sql`
- [ ] Ejecutar `062_create_sectores_table.sql`
- [ ] Ejecutar `063_create_mesas_table.sql`
- [ ] Ejecutar `064_create_mesas_ventas.sql`
- [ ] Ejecutar `065_create_mesas_triggers.sql`
- [ ] Ejecutar `066_create_mesas_functions.sql`
- [ ] Ejecutar `067_enable_realtime_mesas.sql`
- [ ] Ejecutar `068_create_sectores_seguridad_assignment.sql`
- [ ] Verificar que todas las tablas, funciones y triggers se crearon correctamente

#### Fase 2: Tipos y Servicios Frontend
- [ ] Actualizar `src/types/database.ts` con los nuevos tipos
- [ ] Crear `src/services/sectores.service.ts`
- [ ] Crear `src/services/mesas.service.ts`
- [ ] Crear `src/services/ventas-mesas.service.ts`
- [ ] Crear `src/services/escaneos-mesas.service.ts`
- [ ] Crear `src/services/sectores-seguridad.service.ts`
- [ ] Crear `src/services/mesas-rpc.service.ts`
- [ ] Probar cada servicio en consola del navegador

#### Fase 3: Hooks Personalizados
- [ ] Crear `src/features/mesas/hooks/useSectores.ts`
- [ ] Crear `src/features/mesas/hooks/useMesas.ts`
- [ ] Crear `src/features/mesas/hooks/useMesaInteraction.ts`
- [ ] Crear `src/features/mesas/hooks/useEscaneoMesa.ts`
- [ ] Probar hooks en componentes de prueba

#### Fase 4: Componentes Admin
- [ ] Crear `SectorFormDialog.tsx` (formulario crear/editar sector)
- [ ] Crear `SectoresPage.tsx` (lista de sectores + CRUD)
- [ ] Probar CRUD de sectores
- [ ] Implementar upload de imagen 1080x1920
- [ ] Crear `MesaFormDialog.tsx` (formulario crear/editar mesa)
- [ ] Crear `MesasAdminPage.tsx` (lista de mesas + CRUD)
- [ ] Probar CRUD de mesas
- [ ] Crear `SectorMapEditor.tsx` (drag & drop para posicionar mesas)
- [ ] Probar posicionamiento de mesas en el plano
- [ ] Implementar asignación de seguridad a sectores

#### Fase 5: Componentes RRPP
- [ ] Crear `SectorMapView.tsx` (visualización del plano)
- [ ] Probar visualización de mesas en el plano
- [ ] Crear `MesaDetailDialog.tsx` (modal de detalle de mesa)
- [ ] Crear `VenderMesaDialog.tsx` (formulario de venta)
- [ ] Crear `MesasRRPPPage.tsx` (página principal de mesas RRPP)
- [ ] Implementar reservar/liberar/vender mesas
- [ ] Probar flujo completo de venta
- [ ] Actualizar `BottomNavigation.tsx` para agregar "Mesas"
- [ ] Crear `VentasMesasRRPPPage.tsx` (mis ventas de mesas)

#### Fase 6: Componentes Seguridad
- [ ] Actualizar `ScannerPage.tsx` o crear `ScannerMesasPage.tsx`
- [ ] Integrar scanner QR para mesas
- [ ] Crear `MesaLocationView.tsx` (mostrar ubicación de mesa en plano)
- [ ] Probar escaneo y visualización de ubicación

#### Fase 7: Componentes Bartender
- [ ] Crear `BartenderLayout.tsx`
- [ ] Crear `BottomNavigationBartender.tsx`
- [ ] Crear `BartenderScannerPage.tsx` (scanner de consumiciones)
- [ ] Crear `ConsumicionDetailView.tsx` (modal de confirmación entrega)
- [ ] Crear `BartenderHistorialPage.tsx` (historial de entregas)
- [ ] Crear `BartenderPerfilPage.tsx`
- [ ] Actualizar `DashboardRouter.tsx` para agregar rutas bartender
- [ ] Probar flujo completo de entrega de consumiciones

#### Fase 8: Realtime y Optimizaciones
- [ ] Implementar realtime subscriptions en todos los componentes
- [ ] Probar actualizaciones en tiempo real
- [ ] Optimizar re-renders innecesarios
- [ ] Implementar skeleton loaders
- [ ] Probar responsive en diferentes tamaños de pantalla
- [ ] Probar en dispositivos móviles reales

#### Fase 9: Testing y Validaciones
- [ ] Validar imagen 1080x1920 funciona correctamente
- [ ] Validar DNI antes de venta
- [ ] Validar estados de mesa antes de acciones
- [ ] Probar permisos RLS (cada rol solo ve lo que debe)
- [ ] Probar asignación de seguridad a sectores
- [ ] Probar QR inválidos
- [ ] Probar múltiples escaneos en misma mesa
- [ ] Probar límite de personas por mesa

#### Fase 10: Documentación y Deploy
- [ ] Actualizar CLAUDE.md con información de mesas
- [ ] Documentar flujos de uso
- [ ] Crear manual de usuario para cada rol
- [ ] Deploy a producción
- [ ] Monitorear errores en Sentry/LogRocket

---

## NOTAS IMPORTANTES

### Permisos y RLS

Todos los componentes deben respetar RLS:
- **Admin**: Puede crear/editar/eliminar sectores y mesas
- **RRPP**: Puede reservar/vender mesas, solo ve sus propias ventas
- **Seguridad**: Solo puede escanear QR, solo en sectores asignados
- **Bartender**: Solo puede escanear consumiciones y marcar entregadas

### Storage Buckets

Asegúrate de que el bucket `sectores-imagenes` existe en Supabase Storage:

```sql
-- Crear bucket (ejecutar en Supabase Dashboard SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sectores-imagenes', 'sectores-imagenes', true);

-- RLS policy para upload (solo admin)
CREATE POLICY "Admin can upload sector images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sectores-imagenes' AND
  (SELECT rol FROM personal WHERE id = auth.uid()) = 'admin'
);

-- RLS policy para lectura (todos autenticados)
CREATE POLICY "Anyone can view sector images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sectores-imagenes');
```

### Performance

- Usa `useMemo` para cálculos pesados (ej: filtrar mesas)
- Usa `useCallback` para event handlers que se pasan como props
- Implementa virtualización si hay muchas mesas (react-window)
- Optimiza imágenes antes de subir (compr imirlas)

### Debugging

Si algo no funciona:

1. **Check RLS policies**: Verifica en Supabase Dashboard que las políticas RLS están habilitadas
2. **Check realtime**: Verifica que el canal se suscribe correctamente (logs en consola)
3. **Check triggers**: Verifica que los triggers se ejecutan (query a la tabla directamente)
4. **Check types**: Verifica que los tipos en `database.ts` coinciden con la DB

### Próximos Pasos

Después de implementar el sistema de mesas, considera:

1. **Reportes**: Generar reportes de ventas de mesas por evento
2. **Analytics**: Dashboard de estadísticas de ocupación
3. **Notificaciones**: Push notifications cuando se vende una mesa
4. **Exportar datos**: CSV/PDF de ventas y comisiones
5. **Multi-idioma**: i18n para soportar otros idiomas

---

## FIN DE LA GUÍA

Esta guía completa debe permitirte implementar el sistema de mesas desde cero siguiendo los patrones del proyecto. Cualquier duda, consulta los archivos de referencia existentes y sigue el orden de implementación sugerido.

**Archivos de referencia consultados:**
- `src/App.tsx`
- `src/components/organisms/BottomNavigation.tsx`
- `src/components/organisms/RRPPLayout.tsx`
- `src/components/pages/seguridad/ScannerPage.tsx`
- `src/components/pages/admin/EventosPage.tsx`
- `src/components/pages/rrpp/InvitadosPage.tsx`
- `src/services/ventas.service.ts`
- `src/services/lotes-seguridad.service.ts`
- `CLAUDE.md`

**SQL Scripts:**
- `061_create_bartender_role.sql`
- `062_create_sectores_table.sql`
- `063_create_mesas_table.sql`
- `064_create_mesas_ventas.sql`
- `065_create_mesas_triggers.sql`
- `066_create_mesas_functions.sql`
- `067_enable_realtime_mesas.sql`
- `068_create_sectores_seguridad_assignment.sql`
