#!/usr/bin/env bash

# Instala dependencias Python
pip install -r requirements.txt

# Compila frontend React
cd padel-web
npm install
npm run build
cd ..

# Copia el build de React al directorio estático de Django
rm -rf backend/staticfiles/*
mkdir -p backend/staticfiles
cp -r padel-web/dist/* backend/staticfiles/

# Migraciones y collectstatic
python manage.py migrate
python manage.py collectstatic --noinput