#!/usr/bin/env bash

# 👇 Asegura que Django detecta que estamos en Render
export RENDER=true

# 1. Instalar dependencias de Python
pip install -r requirements.txt

# 2. Compilar frontend React
cd padel-web
npm install
npm run build
cd ..

# 3. Copiar frontend a carpeta estática
rm -rf backend/staticfiles/*
mkdir -p backend/staticfiles
cp -r padel-web/dist/* backend/staticfiles/

# 4. Migraciones y collectstatic
python manage.py migrate
python manage.py collectstatic --noinput