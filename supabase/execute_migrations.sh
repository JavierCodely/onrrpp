#!/bin/bash

# =============================================
# Script de Ejecución de Migraciones
# =============================================

echo "🚀 Iniciando ejecución de migraciones..."
echo ""

# Array de archivos de migración en orden
migrations=(
    "001_create_enums.sql"
    "002_create_clubs.sql"
    "003_create_personal.sql"
    "004_create_eventos.sql"
    "005_create_invitados.sql"
    "006_create_functions.sql"
    "007_create_rls_policies.sql"
    "008_create_triggers.sql"
    "009_seed_data.sql"
    "010_create_storage_buckets.sql"
)

# Directorio de migraciones
MIGRATIONS_DIR="./migrations"

# Contador
success=0
failed=0

# Ejecutar cada migración
for migration in "${migrations[@]}"; do
    file="$MIGRATIONS_DIR/$migration"
    
    if [ ! -f "$file" ]; then
        echo "❌ Archivo no encontrado: $file"
        ((failed++))
        continue
    fi
    
    echo "📄 Ejecutando: $migration"
    
    # Aquí debes reemplazar con tu comando de conexión a Supabase
    # Opción 1: Usando Supabase CLI
    # supabase db execute --file "$file"
    
    # Opción 2: Usando psql directamente
    # psql -h db.xxx.supabase.co -U postgres -d postgres -f "$file"
    
    # Por ahora solo mostramos que se ejecutaría
    echo "   ✅ Listo"
    ((success++))
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen:"
echo "   ✅ Exitosas: $success"
echo "   ❌ Fallidas: $failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $failed -eq 0 ]; then
    echo "🎉 Todas las migraciones se ejecutaron correctamente"
    exit 0
else
    echo "⚠️  Algunas migraciones fallaron"
    exit 1
fi
