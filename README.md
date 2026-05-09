# 🛒 Olist Data Warehouse — Guía de Instalación Paso a Paso

## Estructura del Proyecto
```
olist-datawarehouse/
├── agentes/
│   ├── agente_tcp.py       ← Agente transaccional (TCP)
│   └── agente_udp.py       ← Agente de telemetría (UDP)
├── servidor/
│   └── servidor.py         ← Servidor concurrente (TCP + UDP)
├── api/
│   ├── main.py             ← API REST con FastAPI
│   ├── cargar_datos.py     ← Carga inicial de CSVs a Supabase
│   └── requirements.txt    ← Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/     ← Gráficas y tablas
│   ├── package.json
│   └── index.html
├── data/                   ← CSVs de Olist
└── .env.example            ← Plantilla de variables de entorno
```

---

## PASO 1 — Configurar Supabase (base de datos en la nube)

1. Ir a https://supabase.com y crear cuenta gratuita
2. Clic en **"New Project"** → Nombrar `olist-dw` → elegir contraseña → crear
3. Esperar ~2 minutos a que el proyecto se inicialice
4. Ir a **Settings → Database** y copiar:
   - `Host` (algo como `db.abcdefgh.supabase.co`)
   - `Password` (la que pusiste al crear)
5. Copiar `.env.example` como `.env` y llenar los valores:

```bash
cp .env.example .env
# Editar .env con tus datos de Supabase
```

---

## PASO 2 — Instalar dependencias Python

```bash
pip install fastapi uvicorn psycopg2-binary python-dotenv
```

---

## PASO 3 — Cargar datos en Supabase

```bash
cd api
python cargar_datos.py
```

Este script crea las tablas y sube los CSVs. Tarda ~1-2 minutos.

---

## PASO 4 — Iniciar el servidor concurrente

```bash
cd servidor
python servidor.py
```

Deja esta terminal abierta. Verás:
```
TCP SERVER escuchando en 127.0.0.1:12000
UDP SERVER escuchando en 127.0.0.1:12001
```

---

## PASO 5 — Ejecutar los agentes (en terminales separadas)

**Terminal 2 — Agente TCP:**
```bash
cd agentes
python agente_tcp.py
```

**Terminal 3 — Agente UDP:**
```bash
cd agentes
python agente_udp.py
```

---

## PASO 6 — Iniciar la API

```bash
cd api
uvicorn main:app --reload
```

La API estará en: http://127.0.0.1:8000
Documentación automática: http://127.0.0.1:8000/docs

---

## PASO 7 — Iniciar el Frontend React

```bash
cd frontend
npm install
npm run dev
```

El dashboard estará en: http://localhost:5173

---

## PASO 8 — Deploy en Vercel (producción)

### Frontend:
1. Subir el proyecto a GitHub
2. Ir a https://vercel.com → conectar repositorio
3. Configurar:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Variable de entorno:** `VITE_API_URL` = URL de tu API en la nube

### API (usar Railway o Render — gratuitos):
1. Ir a https://render.com → New Web Service
2. Conectar el repositorio GitHub
3. Root directory: `api`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
6. Agregar las variables de entorno (.env)

---

## Métricas que responde el sistema

| Métrica | Endpoint |
|---------|----------|
| Ventas por estado de Brasil | `/api/ventas-estado` |
| Categorías con más ventas | `/api/categorias` |
| Distribución de reviews | `/api/reviews` |
| Métodos de pago | `/api/pagos` |
| Datos TCP+UDP en vivo | `/api/datos` |
| Telemetría UDP reciente | `/api/telemetria` |
