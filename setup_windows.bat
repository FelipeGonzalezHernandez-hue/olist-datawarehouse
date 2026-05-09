@echo off
echo ============================================
echo   OLIST DATA WAREHOUSE - SETUP AUTOMATICO
echo ============================================
echo.

echo [1/3] Instalando dependencias Python...
pip install fastapi uvicorn psycopg2-binary python-dotenv

echo.
echo [2/3] Cargando datos CSV a Supabase...
cd api
python cargar_datos.py

echo.
echo [3/3] Iniciando API...
echo.
echo ✅ Cuando termines de ver los datos cargados, presiona cualquier tecla
echo    para iniciar la API en http://127.0.0.1:8000
pause
uvicorn main:app --reload --host 0.0.0.0 --port 8000
