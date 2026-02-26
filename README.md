# Sistema de Gestión de Eventos - ONRRPP

Sistema multi-tenant de gestión de eventos con control de acceso basado en roles (Admin, RRPP, Seguridad). Incluye gestión de invitados, códigos QR, sistema de ventas con comisiones y estadísticas en tiempo real.

## Características Principales

- **Multi-tenant**: Aislamiento completo por club mediante Row Level Security (RLS)
- **3 Roles**: Admin, RRPP (Relaciones Públicas), Seguridad
- **Códigos QR**: Generación automática de QR único por invitado
- **Scanner QR**: Escaneo con cámara para marcar ingresos
- **Sistema de Ventas**: Tracking de ventas con múltiples métodos de pago
- **Comisiones**: Configuración flexible (monto fijo o porcentaje) por lote
- **Realtime**: Actualización en tiempo real de contadores y estados
- **Storage**: Almacenamiento de banners de eventos y fotos VIP

## Stack Tecnológico

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- shadcn/ui + Radix UI
- Tailwind CSS v3
- Zustand (state management)
- React Router DOM v6

### Backend
- Supabase PostgreSQL
- Row Level Security (RLS)
- Realtime subscriptions
- Storage (S3-compatible)
- Auth (email/password)

## Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Ejecutar Migraciones

Ve a Supabase Dashboard → SQL Editor y ejecuta las migraciones en orden:
- `supabase/migrations/001_create_enums.sql` hasta `010_create_storage_buckets.sql`
- Luego las migraciones de features (011+)

### 4. Crear Usuario de Prueba

```sql
-- Crear usuario en Authentication → Users, luego:
INSERT INTO personal (id, nombre, apellido, edad, sexo, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-auth',
  'Admin',
  'Test',
  30,
  'hombre',
  'admin',
  'uuid-del-club',
  true
);
```

### 5. Ejecutar la Aplicación

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## Documentación

La documentación completa está en el directorio `docs/`:

### Setup
- [Guía de Inicio Rápido](./docs/setup/QUICK_START.md)
- [Configuración Frontend](./docs/setup/FRONTEND.md)

### Funcionalidades
- [Sistema de QR](./docs/features/QR_SYSTEM.md)
- [Sistema de Comisiones](./docs/features/COMMISSIONS.md)

### Base de Datos
- [Schema Completo](./supabase/README.md)

### Troubleshooting
- [Problemas Comunes](./docs/troubleshooting/COMMON_ISSUES.md)

### Deployment
- [Deploy en Vercel](./docs/deployment/VERCEL.md)

### Para Claude Code
- [Documentación de Desarrollo](./CLAUDE.md)

## Roles y Permisos

### Admin
- Crear y gestionar eventos
- Configurar lotes y comisiones
- Ver estadísticas totales del club
- Subir banners de eventos

### RRPP (Relaciones Públicas)
- Gestionar sus propios invitados
- Generar códigos QR
- Registrar ventas
- Ver sus comisiones y estadísticas

### Seguridad
- Escanear códigos QR
- Marcar ingreso de invitados
- Ver estadísticas de ingreso en tiempo real

## Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor dev en puerto 5173

# Build
npm run build            # Compila TypeScript + Build de producción
npm run preview          # Preview del build de producción

# Linting
npm run lint             # Ejecuta ESLint
```

## Arquitectura

### Multi-Tenant Design
- Clave de aislamiento: `uuid_club`
- Funciones RLS: `get_current_user_club()`, `get_current_user_role()`
- Todas las queries filtradas automáticamente por club del usuario

### Atomic Design
Componentes organizados en:
- `atoms/` - Componentes básicos
- `molecules/` - Combinaciones simples
- `organisms/` - Componentes complejos
- `pages/` - Páginas completas

### State Management
- Zustand para estado de autenticación (persisted)
- Supabase Realtime para actualizaciones en vivo
- Sin estado global para datos de dominio

## Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Aislamiento multi-tenant automático
- Autenticación via Supabase Auth
- Políticas de storage con validación de tipos de archivo
- Validación de capacidad de lotes a nivel de BD

## Deployment

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Ver [Guía Completa de Deployment](./docs/deployment/VERCEL.md)

## Estructura del Proyecto

```
.
├── docs/                    # Documentación organizada
├── src/
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── rrpp/
│   │   │   └── seguridad/
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Supabase client, utils
│   ├── services/           # API services
│   ├── stores/             # Zustand stores
│   └── types/              # TypeScript types
├── supabase/
│   ├── migrations/         # Migraciones SQL
│   └── README.md          # Documentación de DB
├── CLAUDE.md              # Docs para Claude Code
├── vercel.json            # Config de Vercel
└── package.json
```

## Problemas Comunes

### "Personal no encontrado"
El usuario existe en auth.users pero no en la tabla personal. Ejecuta el INSERT del paso 4.

### Build fails con Tailwind
Usa Tailwind v3, NO v4. Ver [Troubleshooting](./docs/troubleshooting/COMMON_ISSUES.md).

### Cámara no funciona
Requiere HTTPS. Ya configurado con `@vitejs/plugin-basic-ssl` en desarrollo.

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y propietario.

## Soporte

Para problemas o preguntas:
1. Revisa la [Documentación](./docs/README.md)
2. Consulta [Problemas Comunes](./docs/troubleshooting/COMMON_ISSUES.md)
3. Verifica los logs en Supabase Dashboard
