"""
API REST - FASTAPI con asyncpg (compatible con Railway)
"""
 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import os
import json
from dotenv import load_dotenv
 
load_dotenv()
 
app = FastAPI(title="Olist Data Warehouse API", version="1.0.0")
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
 
async def get_db():
    return await asyncpg.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT', '5432')),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        ssl='require'
    )
 
@app.get("/")
async def root():
    return {"mensaje": "API Olist Data Warehouse funcionando ✅", "version": "1.0.0"}
 
@app.get("/api/datos")
async def obtener_datos(limite: int = 50):
    try:
        conn = await get_db()
        rows = await conn.fetch(
            "SELECT id, origen, contenido, fecha FROM datos_recibidos ORDER BY fecha DESC LIMIT $1", limite
        )
        await conn.close()
        return {"total": len(rows), "datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/ventas-estado")
async def ventas_por_estado():
    try:
        conn = await get_db()
        rows = await conn.fetch("""
            SELECT
                s.seller_state AS estado,
                COUNT(*) AS total_ordenes,
                ROUND(SUM(oi.price)::numeric, 2) AS total_ventas,
                ROUND(AVG(oi.price)::numeric, 2) AS precio_promedio
            FROM order_items oi
            JOIN sellers s ON oi.seller_id = s.seller_id
            GROUP BY s.seller_state
            ORDER BY total_ventas DESC
            LIMIT 15
        """)
        await conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/categorias")
async def ventas_por_categoria():
    try:
        conn = await get_db()
        rows = await conn.fetch("""
            SELECT
                COALESCE(t.product_category_name_english, p.product_category_name, 'Sin categoria') AS categoria,
                COUNT(*) AS total_items,
                ROUND(SUM(oi.price)::numeric, 2) AS total_ventas,
                ROUND(AVG(r.review_score)::numeric, 2) AS score_promedio
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            LEFT JOIN product_category_name_translation t ON p.product_category_name = t.product_category_name
            LEFT JOIN order_reviews r ON oi.order_id = r.order_id
            GROUP BY categoria
            ORDER BY total_ventas DESC
            LIMIT 15
        """)
        await conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/reviews")
async def distribucion_reviews():
    try:
        conn = await get_db()
        rows = await conn.fetch(
            "SELECT review_score AS score, COUNT(*) AS cantidad FROM order_reviews GROUP BY review_score ORDER BY review_score"
        )
        await conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/pagos")
async def tipos_de_pago():
    try:
        conn = await get_db()
        rows = await conn.fetch("""
            SELECT payment_type AS tipo_pago, COUNT(*) AS cantidad,
                   ROUND(SUM(payment_value)::numeric, 2) AS total_valor
            FROM order_payments GROUP BY payment_type ORDER BY cantidad DESC
        """)
        await conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/telemetria")
async def telemetria_reciente():
    try:
        conn = await get_db()
        rows = await conn.fetch(
            "SELECT contenido, fecha FROM datos_recibidos WHERE origen = 'UDP' ORDER BY fecha DESC LIMIT 20"
        )
        await conn.close()
        datos = []
        for r in rows:
            try:
                datos.append({**json.loads(r['contenido']), "fecha_db": str(r['fecha'])})
            except:
                datos.append({"raw": r['contenido'], "fecha_db": str(r['fecha'])})
        return {"datos": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))