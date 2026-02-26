# Documentación - Sistema de Gestión de Eventos ONRRPP

Bienvenido a la documentación completa del sistema de gestión de eventos multi-tenant con control de acceso basado en roles.

## Estructura de Documentación

### Inicio Rápido
- [Guía de Inicio Rápido](./setup/QUICK_START.md) - Configuración inicial en 10 minutos
- [Instalación Frontend](./setup/FRONTEND.md) - Setup del frontend React + Vite
- [Configuración Base de Datos](./setup/DATABASE.md) - Migraciones y configuración de Supabase

### Funcionalidades
- [Sistema de QR](./features/QR_SYSTEM.md) - Gestión de códigos QR para invitados
- [Sistema de Comisiones](./features/COMMISSIONS.md) - Comisiones para RRPP
- [Gestión de Lotes](./features/LOTES.md) - Sistema de lotes y capacidades

### Base de Datos
- [Schema Completo](./database/SCHEMA.md) - Estructura completa de la base de datos
- [Políticas RLS](./database/RLS_POLICIES.md) - Row Level Security y permisos
- [Migraciones](./database/MIGRATIONS.md) - Orden y ejecución de migraciones

### Resolución de Problemas
- [Troubleshooting Común](./troubleshooting/COMMON_ISSUES.md) - Problemas frecuentes y soluciones
- [Problemas de Contadores](./troubleshooting/COUNTERS.md) - Solución a problemas de contadores
- [Problemas de Lotes](./troubleshooting/LOTES_CAPACITY.md) - Validación de capacidad de lotes

### Deployment
- [Deploy en Vercel](./deployment/VERCEL.md) - Guía de despliegue en Vercel
- [Variables de Entorno](./deployment/ENVIRONMENT.md) - Configuración de entorno

## Tecnologías Principales

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Realtime + Storage + Auth)
- **UI**: shadcn/ui + Tailwind CSS v3
- **Estado**: Zustand
- **Arquitectura**: Atomic Design Pattern

## Roles del Sistema

### Admin
- Crear y gestionar eventos
- Ver totales de invitados e ingresados
- Configurar lotes y comisiones
- Subir banners de eventos

### RRPP (Relaciones Públicas)
- Gestionar sus propios invitados
- Generar códigos QR
- Ver sus ventas y comisiones
- Estadísticas personales

### Seguridad
- Escanear códigos QR
- Marcar ingresos de invitados
- Ver estadísticas de ingreso

## Enlaces Útiles

- [Repositorio GitHub](https://github.com/tu-usuario/onrrpp2)
- [Supabase Dashboard](https://app.supabase.com)
- [Documentación de Claude Code](./CLAUDE.md)

## Soporte

Para problemas o preguntas:
1. Revisa la sección de [Troubleshooting](./troubleshooting/COMMON_ISSUES.md)
2. Consulta la documentación de la base de datos
3. Verifica los logs en la consola del navegador
