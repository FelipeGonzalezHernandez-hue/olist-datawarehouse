"""
SCRIPT DE CARGA INICIAL DE DATOS
Sube los CSV de Olist directamente a Supabase (PostgreSQL).
Ejecutar UNA SOLA VEZ antes de usar la API.
"""
 
import psycopg2
import csv
import os
from dotenv import load_dotenv
 
load_dotenv()
 
DB_CONFIG = {
    'host':     os.getenv('DB_HOST'),
    'port':     os.getenv('DB_PORT', '5432'),
    'dbname':   os.getenv('DB_NAME'),
    'user':     os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'sslmode':  'require'
}
 
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
 
 
def conectar():
    return psycopg2.connect(**DB_CONFIG)
 
 
def crear_tablas(conn):
    sql = """
    CREATE TABLE IF NOT EXISTS datos_recibidos (
        id        SERIAL PRIMARY KEY,
        origen    VARCHAR(10) NOT NULL,
        contenido TEXT        NOT NULL,
        fecha     TIMESTAMP   DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS customers (
        customer_id             VARCHAR(50) PRIMARY KEY,
        customer_unique_id      VARCHAR(50),
        customer_zip_code_prefix VARCHAR(10),
        customer_city           VARCHAR(100),
        customer_state          VARCHAR(5)
    );
    CREATE TABLE IF NOT EXISTS products (
        product_id               VARCHAR(50) PRIMARY KEY,
        product_category_name    VARCHAR(100),
        product_name_lenght      INTEGER,
        product_description_lenght INTEGER,
        product_photos_qty       INTEGER,
        product_weight_g         NUMERIC,
        product_length_cm        NUMERIC,
        product_height_cm        NUMERIC,
        product_width_cm         NUMERIC
    );
    CREATE TABLE IF NOT EXISTS product_category_name_translation (
        product_category_name         VARCHAR(100) PRIMARY KEY,
        product_category_name_english VARCHAR(100)
    );
    CREATE TABLE IF NOT EXISTS order_items (
        order_id            VARCHAR(50),
        order_item_id       INTEGER,
        product_id          VARCHAR(50),
        seller_id           VARCHAR(50),
        shipping_limit_date TIMESTAMP,
        price               NUMERIC,
        freight_value       NUMERIC,
        PRIMARY KEY (order_id, order_item_id)
    );
    CREATE TABLE IF NOT EXISTS order_payments (
        order_id             VARCHAR(50),
        payment_sequential   INTEGER,
        payment_type         VARCHAR(30),
        payment_installments INTEGER,
        payment_value        NUMERIC,
        PRIMARY KEY (order_id, payment_sequential)
    );
    CREATE TABLE IF NOT EXISTS order_reviews (
        review_id              VARCHAR(50) PRIMARY KEY,
        order_id               VARCHAR(50),
        review_score           INTEGER,
        review_comment_title   TEXT,
        review_comment_message TEXT,
        review_creation_date   TIMESTAMP,
        review_answer_timestamp TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sellers (
        seller_id               VARCHAR(50) PRIMARY KEY,
        seller_zip_code_prefix  VARCHAR(10),
        seller_city             VARCHAR(100),
        seller_state            VARCHAR(5)
    );
    """
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    cur.close()
    print("✅ Tablas creadas en Supabase")
 
 
def cargar_csv(conn, tabla, archivo, columnas, max_filas=2000):
    """Carga CSV en lotes de 200 filas (rapido)."""
    ruta = os.path.join(DATA_DIR, archivo)
    if not os.path.exists(ruta):
        print(f"⚠️  No encontrado: {ruta}")
        return
 
    placeholders = ','.join(['%s'] * len(columnas))
    cols = ','.join(columnas)
    sql = f"INSERT INTO {tabla} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
 
    insertados = 0
    lote = []
    LOTE = 200
 
    with open(ruta, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for i, fila in enumerate(reader):
            if i >= max_filas:
                break
            valores = [fila.get(c, '').strip() or None for c in columnas]
            lote.append(valores)
 
            if len(lote) >= LOTE:
                try:
                    cur = conn.cursor()
                    cur.executemany(sql, lote)
                    conn.commit()
                    cur.close()
                    insertados += len(lote)
                    print(f"  → {tabla}: {insertados} filas...", end='\r')
                except Exception as e:
                    conn.rollback()
                lote = []
 
    if lote:
        try:
            cur = conn.cursor()
            cur.executemany(sql, lote)
            conn.commit()
            cur.close()
            insertados += len(lote)
        except Exception:
            conn.rollback()
 
    print(f"✅ {tabla}: {insertados} filas cargadas          ")
 
 
def main():
    print("=" * 55)
    print("  CARGANDO DATOS OLIST → SUPABASE")
    print("=" * 55)
 
    conn = conectar()
    print("✅ Conectado a Supabase\n")
 
    crear_tablas(conn)
    print()
 
    cargar_csv(conn, 'customers', 'olist_customers_dataset.csv',
               ['customer_id','customer_unique_id','customer_zip_code_prefix','customer_city','customer_state'],
               max_filas=2000)
 
    cargar_csv(conn, 'products', 'olist_products_dataset.csv',
               ['product_id','product_category_name','product_name_lenght',
                'product_description_lenght','product_photos_qty',
                'product_weight_g','product_length_cm','product_height_cm','product_width_cm'],
               max_filas=2000)
 
    cargar_csv(conn, 'product_category_name_translation', 'product_category_name_translation.csv',
               ['product_category_name','product_category_name_english'],
               max_filas=200)
 
    cargar_csv(conn, 'order_items', 'olist_order_items_dataset.csv',
               ['order_id','order_item_id','product_id','seller_id',
                'shipping_limit_date','price','freight_value'],
               max_filas=3000)
 
    cargar_csv(conn, 'order_payments', 'olist_order_payments_dataset.csv',
               ['order_id','payment_sequential','payment_type',
                'payment_installments','payment_value'],
               max_filas=3000)
 
    cargar_csv(conn, 'order_reviews', 'olist_order_reviews_dataset.csv',
               ['review_id','order_id','review_score','review_comment_title',
                'review_comment_message','review_creation_date','review_answer_timestamp'],
               max_filas=3000)
 
    cargar_csv(conn, 'sellers', 'olist_sellers_dataset.csv',
               ['seller_id','seller_zip_code_prefix','seller_city','seller_state'],
               max_filas=1000)
 
    conn.close()
    print("\n🎉 ¡Carga completada! Ya puedes iniciar la API.")
 
 
if __name__ == '__main__':
    main()
 