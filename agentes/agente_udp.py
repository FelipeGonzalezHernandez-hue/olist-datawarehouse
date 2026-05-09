"""
AGENTE DE TELEMETRÍA - PROTOCOLO UDP
Simula sensores en tiempo real que envían métricas de e-commerce:
- Precios promedio
- Cantidades de órdenes
- Scores de reseñas simulados

Puerto destino: 12001
"""

import socket
import random
import time
import json
from datetime import datetime

# ─── CONFIGURACIÓN ────────────────────────────────────────────────
HOST = '127.0.0.1'
PORT = 12001
DELAY_SEGUNDOS = 0.5      # Envío cada 0.5 segundos (alta frecuencia)
MAX_ENVIOS = 100          # Cantidad de paquetes a enviar en la demo

# Categorías de productos del dataset Olist
CATEGORIAS = [
    "health_beauty", "computers_accessories", "auto", "baby",
    "musical_instruments", "consoles_games", "perfumery",
    "telephony", "furniture_decor", "sports_leisure",
    "garden_tools", "toys", "cool_stuff", "housewares",
    "watches_gifts", "bed_bath_table"
]

ESTADOS_BRASIL = [
    "SP", "RJ", "MG", "RS", "PR", "SC", "BA", "GO", "ES", "PE"
]


def generar_telemetria():
    """Genera un paquete de telemetría con datos aleatorios realistas."""
    return {
        "timestamp": datetime.now().isoformat(),
        "tipo": "telemetria",
        "sensor_id": f"SENSOR-{random.randint(1, 20):03d}",
        "categoria_producto": random.choice(CATEGORIAS),
        "estado_cliente": random.choice(ESTADOS_BRASIL),
        "precio_promedio": round(random.uniform(20.0, 500.0), 2),
        "flete_promedio": round(random.uniform(8.0, 60.0), 2),
        "review_score": round(random.uniform(1.0, 5.0), 1),
        "ordenes_ultimo_minuto": random.randint(1, 50),
        "conversion_rate": round(random.uniform(0.01, 0.15), 4)
    }


def enviar_datos_udp():
    """Crea socket UDP y envía paquetes de telemetría al servidor."""
    
    print(f"[UDP AGENT] Iniciando envío de telemetría a {HOST}:{PORT} ...")
    print(f"[UDP AGENT] Protocolo: UDP (sin confirmación de entrega)\n")
    
    # Crear socket UDP (SOCK_DGRAM = no orientado a conexión, rápido)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        
        for i in range(1, MAX_ENVIOS + 1):
            
            # Generar datos de telemetría
            datos = generar_telemetria()
            mensaje = json.dumps(datos)
            
            # Enviar el datagrama (sin establecer conexión previa)
            sock.sendto(mensaje.encode('utf-8'), (HOST, PORT))
            
            print(f"[UDP AGENT] 📡 Paquete {i}/{MAX_ENVIOS} | "
                  f"Sensor: {datos['sensor_id']} | "
                  f"Cat: {datos['categoria_producto']} | "
                  f"Precio: ${datos['precio_promedio']}")
            
            # Alta frecuencia: 0.5 segundos entre envíos
            time.sleep(DELAY_SEGUNDOS)
    
    print(f"\n[UDP AGENT] ✅ {MAX_ENVIOS} paquetes de telemetría enviados.")


if __name__ == '__main__':
    enviar_datos_udp()
