#!/usr/bin/env bash

# Marca que estás en Render
export RENDER=true

# 1. Dependencias Python
pip install -r requirements.txt

# 2. Build del frontend
cd padel-web
npm install
npm run build
cd ..

# 3. Mover a staticfiles
rm -rf backend/staticfiles/*
mkdir -p backend/staticfiles
cp -r padel-web/dist/* backend/staticfiles/

# 4. Migraciones y collectstatic
python manage.py migrate
python manage.py collectstatic --noinput