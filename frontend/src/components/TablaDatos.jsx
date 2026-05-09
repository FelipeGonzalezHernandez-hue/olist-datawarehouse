import { useEffect, useState } from "react";

export default function TablaDatos({ apiUrl }) {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    fetch(`${apiUrl}/api/datos?limite=30`)
      .then(r => r.json())
      .then(d => { setDatos(d.datos || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [apiUrl]);

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    const timer = setInterval(cargar, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, color: "#f1f5f9" }}>🔄 Datos Recibidos en Tiempo Real</h3>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
            Se actualiza cada 5 segundos · TCP (transaccional) + UDP (telemetría)
          </p>
        </div>
        <button onClick={cargar} style={{
          padding: "8px 16px", background: "#38bdf8", color: "#0f172a",
          border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13
        }}>
          ↻ Actualizar
        </button>
      </div>

      {loading && <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Cargando...</p>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                {["ID", "Origen", "Contenido", "Fecha"].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left",
                    color: "#64748b", fontWeight: 600, fontSize: 12,
                    borderBottom: "1px solid #334155", whiteSpace: "nowrap"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  Sin datos. ¿Está corriendo el servidor y los agentes?
                </td></tr>
              ) : datos.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid #1e293b" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0f172a"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td style={td}>{row.id}</td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: row.origen === "TCP" ? "#0c4a6e" : "#4a044e",
                      color: row.origen === "TCP" ? "#38bdf8" : "#e879f9"
                    }}>{row.origen}</span>
                  </td>
                  <td style={{ ...td, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#94a3b8" }}>
                    {row.contenido?.substring(0, 120)}...
                  </td>
                  <td style={{ ...td, color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(row.fecha).toLocaleString("es-MX")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const td = { padding: "10px 12px", color: "#e2e8f0", verticalAlign: "middle" };
