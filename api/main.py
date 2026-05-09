"""
API REST - FASTAPI
Expone los datos almacenados en Supabase mediante endpoints HTTP.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
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

def get_db():
    return psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT', '5432'),
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        sslmode='require'
    )

@app.get("/")
def root():
    return {"mensaje": "API Olist Data Warehouse funcionando ✅", "version": "1.0.0"}

@app.get("/api/datos")
def obtener_datos(limite: int = 50):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, origen, contenido, fecha FROM datos_recibidos ORDER BY fecha DESC LIMIT %s", (limite,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"total": len(rows), "datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ventas-estado")
def ventas_por_estado():
    """Ventas por estado usando sellers + order_items (JOIN directo disponible)."""
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
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
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categorias")
def ventas_por_categoria():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
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
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reviews")
def distribucion_reviews():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT review_score AS score, COUNT(*) AS cantidad FROM order_reviews GROUP BY review_score ORDER BY review_score")
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pagos")
def tipos_de_pago():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT payment_type AS tipo_pago, COUNT(*) AS cantidad,
                   ROUND(SUM(payment_value)::numeric, 2) AS total_valor
            FROM order_payments GROUP BY payment_type ORDER BY cantidad DESC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"datos": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetria")
def telemetria_reciente():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT contenido, fecha FROM datos_recibidos WHERE origen = 'UDP' ORDER BY fecha DESC LIMIT 20")
        rows = cur.fetchall()
        cur.close(); conn.close()
        datos = []
        for r in rows:
            try:
                datos.append({**json.loads(r['contenido']), "fecha_db": str(r['fecha'])})
            except:
                datos.append({"raw": r['contenido'], "fecha_db": str(r['fecha'])})
        return {"datos": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))