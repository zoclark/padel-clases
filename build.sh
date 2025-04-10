#!/usr/bin/env bash

# 1. Instalar dependencias Python
pip install -r requirements.txt

# 2. Compilar frontend React
cd padel-web
npm install
npm run build
cd ..

# 3. Copiar build de React a Django static
rm -rf backend/staticfiles/*
cp -r padel-web/dist/* backend/staticfiles/

# 4. Migraciones y collectstatic
python manage.py migrate
python manage.py collectstatic --noinput
