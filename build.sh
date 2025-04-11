#!/usr/bin/env bash

# ⚙️ Render detecta que es producción
export RENDER=true

# 1. Instalar dependencias Python
pip install -r requirements.txt

# 2. Compilar el frontend React
cd padel-web
npm install
npm run build
cd ..

# 3. Copiar el build a staticfiles
rm -rf backend/staticfiles/*
mkdir -p backend/staticfiles
cp -r padel-web/dist/* backend/staticfiles/

# 4. Migraciones y static
python manage.py migrate
python manage.py collectstatic --noinput