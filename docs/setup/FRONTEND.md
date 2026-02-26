# Configuración del Frontend

## Stack Tecnológico

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI + Tailwind)
- **Styling**: Tailwind CSS v3
- **State Management**: Zustand
- **Routing**: React Router DOM v6
- **QR Code**: qrcode.react + html5-qrcode

## Instalación de Dependencias

```bash
npm install
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── atoms/           # Componentes básicos (botones, inputs)
│   ├── molecules/       # Combinación de atoms
│   ├── organisms/       # Componentes complejos (layouts)
│   ├── pages/           # Páginas completas
│   │   ├── admin/       # Páginas de Admin
│   │   ├── rrpp/        # Páginas de RRPP
│   │   └── seguridad/   # Páginas de Seguridad
│   └── ui/              # Componentes shadcn/ui
├── lib/
│   ├── supabase.ts      # Cliente de Supabase
│   └── utils.ts         # Utilidades (cn, etc)
├── services/            # Servicios de API
│   ├── auth.service.ts
│   ├── eventos.service.ts
│   ├── invitados.service.ts
│   ├── lotes.service.ts
│   └── ventas.service.ts
├── stores/              # Zustand stores
│   └── auth.store.ts
├── types/               # TypeScript types
│   └── database.ts
└── App.tsx
```

## Arquitectura

### Atomic Design

El proyecto sigue el patrón Atomic Design:

- **Atoms**: Componentes básicos reutilizables
- **Molecules**: Combinaciones simples de atoms
- **Organisms**: Componentes complejos con lógica
- **Templates**: Layouts de páginas
- **Pages**: Páginas completas con datos

### State Management

- **Zustand** para estado de autenticación (persisted)
- **React Query** NO se usa (queries directas a Supabase)
- **Supabase Realtime** para actualizaciones en tiempo real

### Routing

```typescript
// Rutas públicas
/login

// Rutas protegidas
/dashboard/admin
/dashboard/rrpp
/dashboard/seguridad
```

**Protección de rutas**: Componente `ProtectedRoute` verifica:
1. Usuario autenticado
2. Usuario activo
3. Redirección según rol

## Componentes shadcn/ui

Instalados:
- Button, Input, Label
- Dialog, Sheet, Dropdown Menu
- Select, Tabs, Toast
- Table, Badge, Card
- Form components

### Agregar más componentes

```bash
npx shadcn@latest add <component-name>
```

## Configuración de Tailwind

**Versión**: Tailwind CSS v3 (NO v4 - causa problemas de build)

**Archivos**:
- `tailwind.config.js` - Configuración de Tailwind
- `postcss.config.js` - PostCSS config
- `src/index.css` - Variables CSS y estilos globales

### CSS Variables (Theming)

Edita `src/index.css` para cambiar colores:

```css
:root {
  --primary: 220 90% 56%;
  --secondary: 210 40% 96%;
  --accent: 220 90% 56%;
  --destructive: 0 84% 60%;
  /* ... */
}
```

### Dark Mode

Dark mode disponible pero no implementado por defecto.

Para activar:
1. Descomentar configuración en `tailwind.config.js`
2. Agregar provider de theme

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

## Configuración de Vite

**Archivo**: `vite.config.ts`

Configuración actual:
- Plugin React SWC (fast refresh)
- Plugin Basic SSL (para cámara en desarrollo)
- Alias `@` apunta a `src/`

### HTTPS en Desarrollo

El proyecto usa `@vitejs/plugin-basic-ssl` para HTTPS en desarrollo.

**Razón**: La cámara web requiere HTTPS para funcionar.

## Variables de Entorno

Archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
```

**Importante**: Variables deben tener prefijo `VITE_` para ser accesibles.

## Mobile Support

### Safe Area Insets

Clase CSS disponible: `.pb-safe`

```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

Úsala en botones fijos en mobile para evitar overlap con notches.

### Responsive Design

Mobile-first approach:
- Breakpoints de Tailwind por defecto
- Dialogs con botones fijos en bottom en mobile
- Layouts adaptables

## TypeScript

### Configuración

- `tsconfig.json` - Config principal
- `tsconfig.app.json` - Config de app
- `tsconfig.node.json` - Config de Vite

### Strict Mode

Activado. Todos los tipos deben estar definidos.

### Types Personalizados

Ubicación: `src/types/database.ts`

Todos los tipos de la base de datos están definidos como interfaces TypeScript.

## Buenas Prácticas

1. **Componentes**:
   - Un componente por archivo
   - Exportar como default
   - Props con interface TypeScript

2. **Servicios**:
   - Toda la lógica de API en `/services`
   - Funciones async/await
   - Manejo de errores con try/catch

3. **Estilos**:
   - Usar clases de Tailwind
   - Utility `cn()` para className condicionales
   - Evitar inline styles

4. **Imports**:
   - Usar alias `@/` para imports absolutos
   - Agrupar imports: externos → internos → tipos

## Troubleshooting

### Build Fails

**Error**: Tailwind v4 incompatible

**Solución**: Usar Tailwind v3
```bash
npm install -D tailwindcss@3 postcss autoprefixer
```

### Cámara no Funciona

**Error**: Camera permission denied

**Solución**: Verificar que el servidor corre con HTTPS (vite.config.ts ya configurado)

### RLS Blocks Queries

No es un problema del frontend. Ver [Documentación de RLS](../database/RLS_POLICIES.md).
