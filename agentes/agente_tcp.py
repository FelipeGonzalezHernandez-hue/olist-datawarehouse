"""
AGENTE TRANSACCIONAL - PROTOCOLO TCP
Simula un sistema crítico que envía registros de órdenes de compra
al servidor central de forma confiable (orientado a conexión).

Dataset: olist_order_items_dataset.csv
Puerto destino: 12000
"""

import socket
import csv
import time
import os

# ─── CONFIGURACIÓN ────────────────────────────────────────────────
HOST = '127.0.0.1'
PORT = 12000
CSV_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'olist_order_items_dataset.csv')
DELAY_SEGUNDOS = 1        # Pausa entre registros para simular tráfico real
MAX_FILAS = 200           # Limitar filas para la demo (el CSV tiene 112k líneas)


def enviar_datos_tcp():
    """Conecta al servidor TCP y envía los registros del CSV línea por línea."""
    
    print(f"[TCP AGENT] Iniciando conexión a {HOST}:{PORT} ...")
    
    # Crear socket TCP (SOCK_STREAM = orientado a conexión, confiable)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        
        try:
            sock.connect((HOST, PORT))
            print(f"[TCP AGENT] ✅ Conectado al servidor exitosamente")
        except ConnectionRefusedError:
            print(f"[TCP AGENT] ❌ No se pudo conectar. ¿Está el servidor corriendo?")
            return
        
        # Abrir y leer el CSV fila por fila
        with open(CSV_FILE, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            filas_enviadas = 0
            for fila in reader:
                if filas_enviadas >= MAX_FILAS:
                    break
                
                # Convertir la fila a string JSON-like para enviarla
                mensaje = str(fila)
                
                try:
                    # Codificar y enviar por la red
                    sock.sendall(mensaje.encode('utf-8'))
                    filas_enviadas += 1
                    print(f"[TCP AGENT] 📤 Fila {filas_enviadas} enviada: order_id={fila.get('order_id','?')[:8]}...")
                    
                    # Esperar respuesta del servidor (ACK)
                    respuesta = sock.recv(1024).decode('utf-8')
                    print(f"[TCP AGENT] 📥 Respuesta: {respuesta}")
                    
                except (BrokenPipeError, ConnectionResetError) as e:
                    print(f"[TCP AGENT] ❌ Conexión perdida: {e}")
                    break
                
                # Pausa para simular tráfico real
                time.sleep(DELAY_SEGUNDOS)
        
        print(f"\n[TCP AGENT] ✅ Proceso completado. {filas_enviadas} registros enviados.")


if __name__ == '__main__':
    enviar_datos_tcp()
