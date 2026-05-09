import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORES_REVIEWS = ["#f87171","#fb923c","#fbbf24","#4ade80","#22d3ee"];
const COLORES_PAGOS   = ["#38bdf8","#a78bfa","#f472b6","#34d399","#fb923c"];

// ── REVIEWS ──────────────────────────────────────────────────────
export function Reviews({ apiUrl }) {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/reviews`)
      .then(r => r.json())
      .then(d => { setDatos(d.datos); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const data = datos.map(d => ({
    name: `⭐ ${d.score} estrellas`,
    value: Number(d.cantidad)
  }));

  return (
    <div style={card}>
      <h3 style={titulo}>⭐ Distribución de Reseñas</h3>
      <p style={subtitulo}>Satisfacción de clientes (scores del 1 al 5)</p>
      {loading ? <p style={msg}>Cargando...</p> : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${(percent*100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORES_REVIEWS[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── PAGOS ────────────────────────────────────────────────────────
export function Pagos({ apiUrl }) {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/pagos`)
      .then(r => r.json())
      .then(d => { setDatos(d.datos); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const labels = {
    credit_card: "Tarjeta Crédito",
    boleto:      "Boleto",
    voucher:     "Voucher",
    debit_card:  "Débito",
    not_defined: "Sin definir"
  };

  const data = datos.map(d => ({
    name: labels[d.tipo_pago] || d.tipo_pago,
    value: Number(d.cantidad)
  }));

  return (
    <div style={card}>
      <h3 style={titulo}>💳 Métodos de Pago</h3>
      <p style={subtitulo}>Distribución de tipos de pago utilizados</p>
      {loading ? <p style={msg}>Cargando...</p> : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${(percent*100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORES_PAGOS[i % COLORES_PAGOS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default Reviews;

const card    = { background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" };
const titulo  = { margin: "0 0 4px", color: "#f1f5f9", fontSize: 16, fontWeight: 600 };
const subtitulo = { margin: "0 0 16px", color: "#64748b", fontSize: 12 };
const msg     = { color: "#94a3b8", textAlign: "center", padding: 40 };
