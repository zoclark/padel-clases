#!/usr/bin/env bash


echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

if [ "$RENDER" = "True" ]; then
    echo "Construyendo para producción en Render..."
    # 1. Dependencias Python
    pip install -r requirements.txt

    # 2. Build del frontend
    cd padel-web
    npm install
    npm run build
    cd ..

    # 3. Mover a staticfiles
    #rm -rf backend/staticfiles/*
    mkdir -p backend/staticfiles
    cp -a padel-web/dist/. backend/staticfiles/

    # 4. Migraciones y collectstatic
    python manage.py migrate
    python manage.py collectstatic --noinput
else
    echo "Entorno local: saltando pasos de build estático."
fi
