import { useEffect, useState } from "react";

export default function Telemetria({ apiUrl }) {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    fetch(`${apiUrl}/api/telemetria`)
      .then(r => r.json())
      .then(d => { setDatos(d.datos || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    const t = setInterval(cargar, 3000);  // Actualiza cada 3s
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 1s infinite" }} />
        <span style={{ color: "#4ade80", fontSize: 13 }}>Actualizando cada 3 segundos</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {loading && <p style={{ color: "#94a3b8" }}>Cargando telemetría...</p>}
        {!loading && datos.length === 0 && (
          <p style={{ color: "#64748b" }}>Sin datos UDP. Ejecuta el agente_udp.py</p>
        )}
        {datos.map((d, i) => (
          <div key={i} style={{
            background: "#1e293b", borderRadius: 10, padding: 16,
            border: "1px solid #334155", fontSize: 13
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#e879f9", fontWeight: 700 }}>{d.sensor_id || "SENSOR"}</span>
              <span style={{ color: "#475569", fontSize: 11 }}>
                {d.fecha_db ? new Date(d.fecha_db).toLocaleTimeString("es-MX") : ""}
              </span>
            </div>
            <Row label="Categoría"   value={d.categoria_producto?.replace(/_/g," ")} />
            <Row label="Estado"      value={d.estado_cliente} />
            <Row label="Precio prom" value={`R$ ${d.precio_promedio}`} color="#38bdf8" />
            <Row label="Flete prom"  value={`R$ ${d.flete_promedio}`} />
            <Row label="Review"      value={`${d.review_score} ⭐`} color="#fbbf24" />
            <Row label="Órdenes/min" value={d.ordenes_ultimo_minuto} color="#4ade80" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
