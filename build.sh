#!/usr/bin/env bash

echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

if [ "${RENDER,,}" = "true" ]; then
    echo "Construyendo para producción en Render..."

    # 🔥 Eliminar .env locales del frontend
    echo "Eliminando .env locales en padel-web..."
    rm -f padel-web/.env*

    # 🔥 Limpiar staticfiles antiguos
    echo "Limpiando staticfiles antiguos..."
    rm -rf backend/staticfiles/*

    # 1. Dependencias Python
    echo "Instalando dependencias de Python..."
    pip install -r requirements.txt

    # 2. Build del frontend
    echo "Iniciando build del frontend..."
    cd padel-web || { echo "❌ ERROR: No se pudo acceder al directorio padel-web"; exit 1; }

    echo "Instalando dependencias de Node.js..."
    npm install || { echo "❌ ERROR: Falló npm install"; exit 1; }

    echo "Ejecutando build de Vite..."
    npm run build || { echo "❌ ERROR: Falló npm run build"; exit 1; }

    cd ..

    # 3. NO hace falta mover nada, ya se genera en backend/staticfiles

    echo "📂 Contenido generado en backend/staticfiles:"
    ls -l backend/staticfiles

    echo "📄 Verificando que index.html exista..."
    if [ ! -f backend/staticfiles/index.html ]; then
        echo "❌ ERROR: No se generó backend/staticfiles/index.html"
        exit 1
    fi

    # 4. Migraciones y static files
    echo "Ejecutando migraciones Django..."
    python manage.py makemigrations --noinput
    python manage.py migrate --noinput

    echo "Recopilando archivos estáticos..."
    python manage.py collectstatic --noinput
else
    echo "Entorno local: saltando pasos de build estático."
fi
