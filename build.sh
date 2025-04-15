#!/usr/bin/env bash
set -e  # ⚠️ Abortar en caso de error

echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

# Convertimos RENDER a minúsculas por seguridad
if [ "${RENDER,,}" = "true" ]; then
    echo "✅ Construyendo para producción en Render..."

    # 1. Instalar dependencias Python
    pip install -r requirements.txt

    # 2. Build del frontend
    echo ">> Ejecutando build de React en padel-web/"
    cd padel-web
    npm ci
    npm run build
    echo "✅ Build de React completado"

    # Confirmamos que existe el build
    if [ ! -d "dist" ]; then
        echo "❌ ERROR: No se generó la carpeta dist en padel-web/"
        exit 1
    fi

    ls -la dist
    cd ..

    # 3. Limpiar y mover a staticfiles
    echo ">> Limpiando y moviendo archivos a backend/staticfiles/"
    rm -rf backend/staticfiles/*
    mkdir -p backend/staticfiles
    cp -a padel-web/dist/. backend/staticfiles/
    echo "<!-- build: $(date +%s) -->" >> backend/staticfiles/index.html

    echo "✅ Archivos copiados a backend/staticfiles:"
    ls -la backend/staticfiles

    # 4. Migraciones y collectstatic
    echo ">> Ejecutando migraciones y collectstatic"
    python manage.py migrate
    python manage.py collectstatic --noinput
else
    echo "⏩ Entorno local: saltando pasos de build estático."
fi
