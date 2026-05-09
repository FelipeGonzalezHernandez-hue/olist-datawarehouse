#!/bin/bash
echo "============================================"
echo "  OLIST DATA WAREHOUSE - SETUP AUTOMATICO"
echo "============================================"
echo ""

echo "[1/3] Instalando dependencias Python..."
pip3 install fastapi uvicorn psycopg2-binary python-dotenv

echo ""
echo "[2/3] Cargando datos CSV a Supabase..."
cd api
python3 cargar_datos.py

echo ""
echo "[3/3] Iniciando API en http://127.0.0.1:8000 ..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
