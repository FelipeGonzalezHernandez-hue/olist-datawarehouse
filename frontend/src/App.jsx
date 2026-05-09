import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

// ─── SUPABASE CONFIG ───────────────────────────────────────────
const SUPABASE_URL = "https://ehlcacwkmjirmsrbyupg.supabase.co";
const SUPABASE_KEY = "sb_publishable_BYZRl5RcmlxPhgGDeTP9_w_jEbYba0i";

async function query(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ sql })
  });
  return res.json();
}

const COLORS = ["#38bdf8","#a78bfa","#f472b6","#34d399","#fb923c","#fbbf24","#f87171"];

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
      <h3 style={{ margin: "0 0 4px", color: "#f1f5f9", fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 12 }}>{subtitle}</p>
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [ventas, setVentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      // Ventas por estado (sellers + order_items)
      const vRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items?select=price,sellers(seller_state)&limit=3000`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const vData = await vRes.json();
      
      // Agrupar ventas por estado
      const ventasMap = {};
      (vData || []).forEach(item => {
        const state = item.sellers?.seller_state || "?";
        if (!ventasMap[state]) ventasMap[state] = { estado: state, total_ventas: 0, total_ordenes: 0 };
        ventasMap[state].total_ventas += parseFloat(item.price || 0);
        ventasMap[state].total_ordenes += 1;
      });
      const ventasArr = Object.values(ventasMap)
        .sort((a, b) => b.total_ventas - a.total_ventas)
        .slice(0, 12)
        .map(v => ({ ...v, total_ventas: Math.round(v.total_ventas) }));
      setVentas(ventasArr);

      // Categorías
      const cRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items?select=price,products(product_category_name,product_category_name_translation(product_category_name_english))&limit=3000`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const cData = await cRes.json();
      const catMap = {};
      (cData || []).forEach(item => {
        const cat = item.products?.product_category_name_translation?.product_category_name_english 
          || item.products?.product_category_name || "other";
        const catShort = cat.replace(/_/g, " ").substring(0, 20);
        if (!catMap[catShort]) catMap[catShort] = { categoria: catShort, total_ventas: 0 };
        catMap[catShort].total_ventas += parseFloat(item.price || 0);
      });
      const catArr = Object.values(catMap)
        .sort((a, b) => b.total_ventas - a.total_ventas)
        .slice(0, 10)
        .map(c => ({ ...c, total_ventas: Math.round(c.total_ventas) }));
      setCategorias(catArr);

      // Reviews
      const rRes = await fetch(`${SUPABASE_URL}/rest/v1/order_reviews?select=review_score&limit=3000`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const rData = await rRes.json();
      const revMap = {};
      (rData || []).forEach(r => {
        const s = r.review_score;
        if (!revMap[s]) revMap[s] = { name: `⭐ ${s} estrellas`, value: 0 };
        revMap[s].value += 1;
      });
      setReviews(Object.values(revMap).sort((a, b) => a.name.localeCompare(b.name)));

      // Pagos
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/order_payments?select=payment_type,payment_value&limit=3000`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      const pData = await pRes.json();
      const pagMap = {};
      const labels = { credit_card: "Tarjeta Crédito", boleto: "Boleto", voucher: "Voucher", debit_card: "Débito" };
      (pData || []).forEach(p => {
        const t = labels[p.payment_type] || p.payment_type;
        if (!pagMap[t]) pagMap[t] = { name: t, value: 0 };
        pagMap[t].value += 1;
      });
      setPagos(Object.values(pagMap).sort((a, b) => b.value - a.value));

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "info", label: "ℹ️ Sobre el Sistema" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "Inter, sans-serif" }}>
      <header style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#38bdf8" }}>🛒 Olist Data Warehouse</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>E-commerce Brasileño · Sistema de Datos en Tiempo Real</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t.id ? "#38bdf8" : "#334155",
                color: tab === t.id ? "#0f172a" : "#f1f5f9",
                fontWeight: tab === t.id ? 700 : 400, fontSize: 13
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {tab === "dashboard" && (
          <>
            <h2 style={{ color: "#e2e8f0", marginTop: 0, marginBottom: 24 }}>📈 Métricas del Negocio</h2>
            {loading ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 60 }}>⏳ Cargando datos desde Supabase...</p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                  <Card title="📍 Ventas por Estado" subtitle="Volumen de ventas (BRL) por estado de Brasil">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={ventas} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="estado" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }}
                          formatter={(v) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                        <Bar dataKey="total_ventas" fill="#38bdf8" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="🏷️ Top Categorías de Productos" subtitle="Ventas totales por categoría (top 10)">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={categorias} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis dataKey="categoria" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={90} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }}
                          formatter={(v) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                        <Bar dataKey="total_ventas" fill="#a78bfa" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <Card title="⭐ Distribución de Reseñas" subtitle="Satisfacción de clientes (scores del 1 al 5)">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={reviews} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`}>
                          {reviews.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="💳 Métodos de Pago" subtitle="Distribución de tipos de pago utilizados">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={pagos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`}>
                          {pagos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#f1f5f9" }} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </>
            )}
          </>
        )}

        {tab === "info" && (
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 32, border: "1px solid #334155", maxWidth: 700 }}>
            <h2 style={{ color: "#38bdf8", marginTop: 0 }}>ℹ️ Sobre el Sistema</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
              Este sistema es un <strong style={{color:"#f1f5f9"}}>Data Warehouse</strong> construido sobre el dataset 
              de e-commerce brasileño <strong style={{color:"#f1f5f9"}}>Olist</strong>.
            </p>
            <h3 style={{ color: "#e2e8f0" }}>🏗️ Arquitectura</h3>
            <ul style={{ color: "#94a3b8", lineHeight: 2 }}>
              <li><strong style={{color:"#38bdf8"}}>Agente TCP</strong> — Envía registros del CSV por socket confiable (puerto 12000)</li>
              <li><strong style={{color:"#a78bfa"}}>Agente UDP</strong> — Envía telemetría aleatoria en tiempo real (puerto 12001)</li>
              <li><strong style={{color:"#34d399"}}>Servidor Concurrente</strong> — Recibe TCP+UDP con hilos (threading)</li>
              <li><strong style={{color:"#fb923c"}}>Supabase</strong> — Base de datos PostgreSQL en la nube</li>
              <li><strong style={{color:"#f472b6"}}>FastAPI</strong> — API REST con endpoints /api/datos, /api/ventas-estado, etc.</li>
              <li><strong style={{color:"#fbbf24"}}>React + Recharts</strong> — Dashboard web con gráficas interactivas</li>
            </ul>
            <h3 style={{ color: "#e2e8f0" }}>📊 Métricas Estratégicas</h3>
            <ul style={{ color: "#94a3b8", lineHeight: 2 }}>
              <li>¿Cuál es el volumen de ventas por estado geográfico de Brasil?</li>
              <li>¿Cuáles son las categorías de productos con mayores ventas?</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
