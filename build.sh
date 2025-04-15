#!/usr/bin/env bash

#!/usr/bin/env bash
set -e  # ⚠️ importante: aborta si falla algún comando

echo ">> Mostrando todas las variables de entorno:"
printenv
echo ">> Fin de variables de entorno"

if [ "$RENDER" = "true" ]; then
    echo "Construyendo para producción en Render..."
    
    # 1. Dependencias Python
    pip install -r requirements.txt

    # 2. Build del frontend
    cd padel-web
    npm install
    npm run build
    echo ">> Contenido de padel-web/dist tras npm run build:"
    ls -la padel-web/dist
    cd ..

    # 3. Mover a staticfiles
    # 3. Limpiar y mover a staticfiles
    rm -rf backend/staticfiles/*
    mkdir -p backend/staticfiles
    cp -a padel-web/dist/. backend/staticfiles/
    echo "<!-- build: $(date +%s) -->" >> backend/staticfiles/index.html

    # ✅ Mostrar qué contiene staticfiles después del copy
    echo ">> Contenido de backend/staticfiles tras build del frontend:"
    ls -la backend/staticfiles
    echo ">> Fin del listado de staticfiles"

    # 4. Migraciones y collectstatic
    python manage.py migrate
    python manage.py collectstatic --noinput
else
    echo "Entorno local: saltando pasos de build estático."
fi
