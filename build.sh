#!/usr/bin/env bash

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


# 4. Migraciones y static
python manage.py migrate
python manage.py collectstatic --noinput