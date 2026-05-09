import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function VentasCategorias({ apiUrl }) {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/categorias`)
      .then(r => r.json())
      .then(d => { setDatos(d.datos); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiUrl]);

  const data = datos.map(d => ({
    ...d,
    categoria_corta: d.categoria?.replace(/_/g, " ").substring(0, 16)
  }));

  return (
    <div style={card}>
      <h3 style={titulo}>🏷️ Top Categorías de Productos</h3>
      <p style={subtitulo}>Ventas totales por categoría (top 10)</p>
      {loading && <p style={msg}>Cargando...</p>}
      {error   && <p style={{...msg, color:"#f87171"}}>Error: {error}</p>}
      {!loading && !error && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.slice(0,10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis dataKey="categoria_corta" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }}
              formatter={(v) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]}
            />
            <Bar dataKey="total_ventas" fill="#a78bfa" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const card    = { background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" };
const titulo  = { margin: "0 0 4px", color: "#f1f5f9", fontSize: 16, fontWeight: 600 };
const subtitulo = { margin: "0 0 16px", color: "#64748b", fontSize: 12 };
const msg     = { color: "#94a3b8", textAlign: "center", padding: 40 };
