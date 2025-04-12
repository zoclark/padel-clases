#!/usr/bin/env bash

echo "🧼 Limpiando carpeta de staticfiles..."
rm -rf backend/staticfiles/*
mkdir -p backend/staticfiles

echo "📦 Instalando dependencias frontend..."
cd padel-web
npm install

echo "🔨 Generando build de producción para React (vite)..."
VITE_ENV=production npm run build
cd ..

echo "🛠️  Activando entorno virtual..."
source venv/bin/activate

echo "🛠️  Cargando variables de entorno de producción..."
export $(grep -v '^#' .env.production | xargs)

echo "📊 Aplicando migraciones..."
python manage.py migrate

echo "📁 Ejecutando collectstatic..."
python manage.py collectstatic --noinput

echo "🚀 Iniciando servidor Django..."
python manage.py runserver 127.0.0.1:8000