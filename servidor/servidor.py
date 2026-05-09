"""
SERVIDOR CONCURRENTE - RECEPCIÓN TCP + UDP
Recibe datos de múltiples clientes simultáneamente usando hilos (threading).
Almacena cada registro recibido en Supabase (PostgreSQL en la nube).

Puertos:
  TCP → 12000 (datos transaccionales del CSV)
  UDP → 12001 (telemetría en tiempo real)
"""

import socket
import threading
import json
import os
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

# ─── CONFIGURACIÓN ────────────────────────────────────────────────
load_dotenv()  # Carga variables desde .env

HOST = '127.0.0.1'
TCP_PORT = 12000
UDP_PORT = 12001
BUFFER_SIZE = 4096

# Conexión a Supabase (PostgreSQL)
DB_CONFIG = {
    'host':     os.getenv('DB_HOST'),
    'port':     os.getenv('DB_PORT', '5432'),
    'dbname':   os.getenv('DB_NAME'),
    'user':     os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'sslmode':  'require'   # Supabase requiere SSL
}


# ─── BASE DE DATOS ─────────────────────────────────────────────────
def obtener_conexion_db():
    """Retorna una nueva conexión a la base de datos de Supabase."""
    return psycopg2.connect(**DB_CONFIG)


def crear_tabla_si_no_existe():
    """Crea la tabla 'datos_recibidos' en la DB si no existe."""
    sql = """
    CREATE TABLE IF NOT EXISTS datos_recibidos (
        id        SERIAL PRIMARY KEY,
        origen    VARCHAR(10) NOT NULL,   -- 'TCP' o 'UDP'
        contenido TEXT        NOT NULL,   -- Dato recibido (string o JSON)
        fecha     TIMESTAMP   DEFAULT NOW()
    );
    """
    try:
        conn = obtener_conexion_db()
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        print("[SERVIDOR] ✅ Tabla 'datos_recibidos' lista en Supabase")
    except Exception as e:
        print(f"[SERVIDOR] ❌ Error creando tabla: {e}")


def insertar_dato(origen: str, contenido: str):
    """Inserta un registro recibido en la base de datos."""
    sql = "INSERT INTO datos_recibidos (origen, contenido, fecha) VALUES (%s, %s, %s)"
    try:
        conn = obtener_conexion_db()
        cur = conn.cursor()
        cur.execute(sql, (origen, contenido, datetime.now()))
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB] 💾 Guardado [{origen}]: {contenido[:60]}...")
    except Exception as e:
        print(f"[DB] ❌ Error insertando: {e}")


# ─── MANEJADOR TCP ─────────────────────────────────────────────────
def manejar_cliente_tcp(conn, addr):
    """
    Función ejecutada en un hilo separado para cada cliente TCP.
    Recibe datos del agente transaccional y los guarda en la DB.
    """
    print(f"\n[TCP] 🔗 Nueva conexión desde {addr}")
    
    with conn:
        while True:
            try:
                # Recibir datos del cliente
                datos = conn.recv(BUFFER_SIZE)
                if not datos:
                    # Cliente cerró la conexión
                    break
                
                mensaje = datos.decode('utf-8')
                print(f"[TCP] 📥 Recibido de {addr}: {mensaje[:80]}...")
                
                # Guardar en Supabase
                insertar_dato('TCP', mensaje)
                
                # Enviar confirmación (ACK) al cliente
                conn.sendall(b"OK: dato recibido y almacenado")
                
            except ConnectionResetError:
                break
            except Exception as e:
                print(f"[TCP] ❌ Error con {addr}: {e}")
                break
    
    print(f"[TCP] 🔌 Conexión cerrada: {addr}")


def iniciar_servidor_tcp():
    """Inicia el servidor TCP que acepta múltiples conexiones concurrentes."""
    print(f"[TCP SERVER] 🚀 Escuchando en {HOST}:{TCP_PORT}")
    
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((HOST, TCP_PORT))
        srv.listen(10)  # Hasta 10 conexiones en cola
        
        while True:
            conn, addr = srv.accept()
            # Crear un hilo nuevo para cada cliente (concurrencia)
            hilo = threading.Thread(
                target=manejar_cliente_tcp,
                args=(conn, addr),
                daemon=True
            )
            hilo.start()
            print(f"[TCP SERVER] 🧵 Hilo activo para {addr} | Total hilos: {threading.active_count()}")


# ─── MANEJADOR UDP ─────────────────────────────────────────────────
def iniciar_servidor_udp():
    """Recibe paquetes UDP de telemetría y los guarda en la DB."""
    print(f"[UDP SERVER] 🚀 Escuchando en {HOST}:{UDP_PORT}")
    
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as srv:
        srv.bind((HOST, UDP_PORT))
        
        while True:
            try:
                # UDP: recibir datagrama (sin conexión previa)
                datos, addr = srv.recvfrom(BUFFER_SIZE)
                mensaje = datos.decode('utf-8')
                print(f"[UDP] 📡 Datagrama de {addr}: {mensaje[:80]}...")
                
                # Guardar en Supabase
                insertar_dato('UDP', mensaje)
                
            except Exception as e:
                print(f"[UDP] ❌ Error: {e}")


# ─── INICIO DEL SERVIDOR ───────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 60)
    print("  SERVIDOR CONCURRENTE - OLIST DATA WAREHOUSE")
    print("=" * 60)
    
    # Preparar base de datos
    crear_tabla_si_no_existe()
    
    # Hilo para TCP
    hilo_tcp = threading.Thread(target=iniciar_servidor_tcp, daemon=True)
    hilo_tcp.start()
    
    # Hilo para UDP
    hilo_udp = threading.Thread(target=iniciar_servidor_udp, daemon=True)
    hilo_udp.start()
    
    print("\n[SERVIDOR] ✅ Sistema activo. Esperando datos...")
    print("[SERVIDOR] Presiona Ctrl+C para detener.\n")
    
    try:
        # Mantener el proceso principal vivo
        hilo_tcp.join()
        hilo_udp.join()
    except KeyboardInterrupt:
        print("\n[SERVIDOR] 🛑 Servidor detenido.")
