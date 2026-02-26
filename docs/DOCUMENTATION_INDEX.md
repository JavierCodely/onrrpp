# Índice de Documentación - Sistema ONRRPP

Esta es la estructura completa y organizada de la documentación del proyecto.

## Estructura de Directorios

```
.
├── README.md                           # Inicio del proyecto (overview general)
├── CLAUDE.md                           # Guía para Claude Code
├── DOCUMENTATION_INDEX.md              # Este archivo (índice completo)
│
├── docs/                               # Documentación organizada
│   ├── README.md                       # Índice de documentación
│   │
│   ├── setup/                          # Configuración inicial
│   │   ├── QUICK_START.md             # Inicio rápido (10 minutos)
│   │   └── FRONTEND.md                # Setup detallado del frontend
│   │
│   ├── features/                       # Funcionalidades del sistema
│   │   ├── QR_SYSTEM.md               # Sistema de códigos QR
│   │   └── COMMISSIONS.md             # Sistema de comisiones RRPP
│   │
│   ├── troubleshooting/                # Resolución de problemas
│   │   └── COMMON_ISSUES.md           # Problemas comunes y soluciones
│   │
│   └── deployment/                     # Deployment y producción
│       └── VERCEL.md                  # Deploy en Vercel
│
└── supabase/                           # Documentación de base de datos
    ├── README.md                       # Schema completo y permisos RLS
    ├── STORAGE_GUIDE.md               # Guía de Storage (banners, VIP)
    ├── VENTAS_GUIDE.md                # Sistema de ventas
    ├── VIP_PROFILES_GUIDE.md          # Perfiles VIP con foto
    ├── SCHEMA_DIAGRAM.md              # Diagramas de relaciones
    ├── RESUMEN_COMPLETO.md            # Resumen general de BD
    ├── NUEVAS_FUNCIONALIDADES.md      # Log de nuevas features
    └── policies/
        └── club_policies.md           # Políticas RLS por club
```

## Guías por Tipo de Usuario

### Nuevo en el Proyecto
1. [README.md](./README.md) - Overview general del proyecto
2. [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) - Configuración en 10 minutos
3. [supabase/README.md](./supabase/README.md) - Entender el schema de BD

### Desarrollador Frontend
1. [docs/setup/FRONTEND.md](./docs/setup/FRONTEND.md) - Stack y arquitectura
2. [CLAUDE.md](./CLAUDE.md) - Convenciones y patrones
3. [docs/features/QR_SYSTEM.md](./docs/features/QR_SYSTEM.md) - Implementación de QR

### Desarrollador Backend/BD
1. [supabase/README.md](./supabase/README.md) - Schema y RLS
2. [supabase/STORAGE_GUIDE.md](./supabase/STORAGE_GUIDE.md) - Gestión de storage
3. [supabase/policies/club_policies.md](./supabase/policies/club_policies.md) - Políticas RLS

### DevOps/Deployment
1. [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md) - Deploy en Vercel
2. [supabase/README.md](./supabase/README.md) - Migraciones de BD

### Troubleshooting
1. [docs/troubleshooting/COMMON_ISSUES.md](./docs/troubleshooting/COMMON_ISSUES.md) - Problemas comunes
2. [CLAUDE.md](./CLAUDE.md) - Sección "Common Issues"

## Guías por Funcionalidad

### Autenticación y Usuarios
- [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md) - Crear usuarios de prueba
- [supabase/README.md](./supabase/README.md) - Tabla personal y roles
- [docs/troubleshooting/COMMON_ISSUES.md](./docs/troubleshooting/COMMON_ISSUES.md) - Errores de auth

### Eventos y Lotes
- [supabase/README.md](./supabase/README.md) - Tablas eventos y lotes
- [CLAUDE.md](./CLAUDE.md) - Gestión de lotes y capacidad

### Invitados y QR
- [docs/features/QR_SYSTEM.md](./docs/features/QR_SYSTEM.md) - Sistema completo de QR
- [supabase/README.md](./supabase/README.md) - Tabla invitados

### Sistema de Ventas
- [supabase/VENTAS_GUIDE.md](./supabase/VENTAS_GUIDE.md) - Ventas y métodos de pago
- [docs/features/COMMISSIONS.md](./docs/features/COMMISSIONS.md) - Comisiones para RRPP

### Storage (Imágenes)
- [supabase/STORAGE_GUIDE.md](./supabase/STORAGE_GUIDE.md) - Banners de eventos
- [supabase/VIP_PROFILES_GUIDE.md](./supabase/VIP_PROFILES_GUIDE.md) - Fotos de perfiles VIP

### Realtime
- [CLAUDE.md](./CLAUDE.md) - Sección "Realtime Features"
- [docs/troubleshooting/COMMON_ISSUES.md](./docs/troubleshooting/COMMON_ISSUES.md) - Troubleshooting Realtime

## Archivos Eliminados

Los siguientes archivos fueron consolidados en la nueva estructura:

- ❌ `APLICAR_AHORA.md` → Consolidado en troubleshooting
- ❌ `DIAGNOSTICO_PASO_A_PASO.md` → Consolidado en troubleshooting
- ❌ `EJECUTA_ESTO.md` → Consolidado en troubleshooting
- ❌ `FIX_LOTE_CAPACITY.md` → Información en CLAUDE.md y troubleshooting
- ❌ `FRONTEND_SETUP.md` → Ahora es `docs/setup/FRONTEND.md`
- ❌ `INICIO_RAPIDO.md` → Ahora es `docs/setup/QUICK_START.md`
- ❌ `SOLUCIONAR_CONTADOR_LOTES.md` → Consolidado en troubleshooting
- ❌ `SOLUCION_FINAL_CONTADORES.md` → Consolidado en troubleshooting
- ❌ `SOLUCION_RLS_RECURSION.md` → Consolidado en troubleshooting
- ❌ `UPDATE_LOTES_SYSTEM.md` → Información en CLAUDE.md
- ❌ `UPDATE_QR_SYSTEM.md` → Ahora es `docs/features/QR_SYSTEM.md`

## Archivos Movidos

- `COMISIONES_RRPP.md` → `docs/features/COMMISSIONS.md` (renombrado y mejorado)
- `DEPLOY_VERCEL.md` → `docs/deployment/VERCEL.md`

## Documentación en Supabase

La documentación en el directorio `supabase/` se mantiene porque:
- Está relacionada específicamente con la base de datos
- Incluye ejemplos de SQL queries
- Es consultada frecuentemente junto con las migraciones
- Mantiene cohesión con la estructura de Supabase

## Buscar Información Rápida

### "¿Cómo inicio el proyecto?"
→ [docs/setup/QUICK_START.md](./docs/setup/QUICK_START.md)

### "¿Cómo funciona el sistema de QR?"
→ [docs/features/QR_SYSTEM.md](./docs/features/QR_SYSTEM.md)

### "Error: Personal no encontrado"
→ [docs/troubleshooting/COMMON_ISSUES.md](./docs/troubleshooting/COMMON_ISSUES.md) - Sección "Autenticación"

### "¿Cómo deplegar en Vercel?"
→ [docs/deployment/VERCEL.md](./docs/deployment/VERCEL.md)

### "¿Qué tablas hay en la BD?"
→ [supabase/README.md](./supabase/README.md)

### "¿Cómo funcionan las comisiones?"
→ [docs/features/COMMISSIONS.md](./docs/features/COMMISSIONS.md)

### "¿Cómo subir imágenes?"
→ [supabase/STORAGE_GUIDE.md](./supabase/STORAGE_GUIDE.md)

### "Contadores no actualizan"
→ [docs/troubleshooting/COMMON_ISSUES.md](./docs/troubleshooting/COMMON_ISSUES.md) - Sección "Contadores"

## Para Claude Code

Si usas Claude Code, consulta [CLAUDE.md](./CLAUDE.md) que contiene:
- Comandos de desarrollo
- Arquitectura del proyecto
- Estructura de archivos
- Patrones de código
- Problemas comunes con soluciones
- Migraciones de BD
- Ubicación de servicios y componentes

## Mantener Actualizada la Documentación

Al agregar nuevas funcionalidades:

1. **Funcionalidad nueva** → Crear/actualizar archivo en `docs/features/`
2. **Cambio en BD** → Actualizar `supabase/README.md` y crear migración
3. **Nuevo problema común** → Agregar en `docs/troubleshooting/COMMON_ISSUES.md`
4. **Cambio en deployment** → Actualizar `docs/deployment/VERCEL.md`
5. **Cambio en arquitectura** → Actualizar `CLAUDE.md` y `docs/setup/FRONTEND.md`

## Contacto y Soporte

Para dudas sobre:
- **Setup inicial**: `docs/setup/`
- **Errores**: `docs/troubleshooting/COMMON_ISSUES.md`
- **Base de datos**: `supabase/README.md`
- **Deployment**: `docs/deployment/VERCEL.md`
