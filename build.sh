#!/usr/bin/env bash
set -e

echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

if [ "${RENDER,,}" = "true" ]; then
    echo "✅ Construyendo para producción en Render..."

    pip install -r requirements.txt

    echo ">> Ejecutando build de React en padel-web/"
    cd padel-web
    npm ci
    npm run build
    echo "✅ Build de React completado"

    if [ ! -d "dist" ]; then
        echo "❌ ERROR: No se generó la carpeta dist en padel-web/"
        exit 1
    fi

    ls -la dist
    cd ..

    echo ">> Limpiando y moviendo archivos a backend/staticfiles/"
    rm -rf backend/staticfiles/*
    mkdir -p backend/staticfiles
    cp -a padel-web/dist/. backend/staticfiles/
    echo "<!-- build: $(date +%s) -->" >> backend/staticfiles/index.html

    echo "✅ Archivos copiados a backend/staticfiles:"
    ls -la backend/staticfiles

    python manage.py migrate
    python manage.py collectstatic --noinput
else
    echo "⏩ Entorno local: saltando pasos de build estático."
fi
