#!/usr/bin/env bash

echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

if [ "${RENDER,,}" = "true" ]; then
    echo "Construyendo para producción en Render..."

    # 🔥 Eliminar .env locales del frontend
    echo "Eliminando .env locales en padel-web..."
    rm -f padel-web/.env*

    # 1. Dependencias Python
    pip install -r requirements.txt

    # 2. Build del frontend
    cd padel-web
    npm install
    npm run build
    cd ..

    # 3. NO hace falta mover nada, ya se genera en backend/staticfiles

    # 4. Migraciones y static files
    python manage.py migrate
    python manage.py collectstatic --noinput
else
    echo "Entorno local: saltando pasos de build estático."
fi
