import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const SUPABASE_URL = "https://ehlcacwkmjirmsrbyupg.supabase.co";
const SUPABASE_KEY = "sb_publishable_BYZRl5RcmlxPhgGDeTP9_w_jEbYba0i";

async function fetchTable(table, select, limit = 3000) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${table}`);
  return res.json();
}

const C_REVIEWS = ["#f87171","#fb923c","#fbbf24","#4ade80","#22d3ee"];
const C_PAGOS   = ["#38bdf8","#a78bfa","#f472b6","#34d399"];

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background:"#1e293b", borderRadius:12, padding:20, border:"1px solid #334155" }}>
      <h3 style={{ margin:"0 0 4px", color:"#f1f5f9", fontSize:16, fontWeight:600 }}>{title}</h3>
      <p style={{ margin:"0 0 16px", color:"#64748b", fontSize:12 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function KPI({ icon, label, value, color }) {
  return (
    <div style={{ background:"#1e293b", borderRadius:12, padding:"18px 22px", border:"1px solid #334155", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ fontSize:28 }}>{icon}</div>
      <div>
        <p style={{ margin:0, color:"#64748b", fontSize:11 }}>{label}</p>
        <p style={{ margin:0, color: color||"#f1f5f9", fontSize:20, fontWeight:700 }}>{value}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [ventas, setVentas] = useState([]);
  const [ticket, setTicket] = useState([]);
  const [ordenesMes, setOrdenesMes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [kpis, setKpis] = useState({ totalVentas:"...", totalOrdenes:"...", ticketPromedio:"...", topEstado:"..." });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true); setError(null);
    try {
      const sellers      = await fetchTable("sellers", "seller_id,seller_state");
      const items        = await fetchTable("order_items", "seller_id,product_id,price,order_id,shipping_limit_date");
      const products     = await fetchTable("products", "product_id,product_category_name", 3000);
      const translations = await fetchTable("product_category_name_translation", "*");
      const reviewData   = await fetchTable("order_reviews", "review_score");
      const pagData      = await fetchTable("order_payments", "payment_type,payment_value");

      // Maps auxiliares
      const sellerMap = {};
      sellers.forEach(s => { if(s.seller_state) sellerMap[s.seller_id] = s.seller_state; });

      const transMap = {};
      translations.forEach(t => { transMap[t.product_category_name] = t.product_category_name_english; });

      const prodMap = {};
      products.forEach(p => {
        prodMap[p.product_id] = (transMap[p.product_category_name] || p.product_category_name || "other")
          .replace(/_/g," ").substring(0,18);
      });

      // 1. Ventas y ticket promedio por estado
      const ventasMap = {};
      items.forEach(item => {
        const state = sellerMap[item.seller_id];
        if (!state) return;
        if (!ventasMap[state]) ventasMap[state] = { estado:state, total_ventas:0, count:0 };
        ventasMap[state].total_ventas += parseFloat(item.price||0);
        ventasMap[state].count += 1;
      });
      const ventasArr = Object.values(ventasMap)
        .sort((a,b) => b.total_ventas - a.total_ventas).slice(0,12)
        .map(v => ({ estado:v.estado, total_ventas:Math.round(v.total_ventas), ticket_promedio:Math.round(v.total_ventas/v.count) }));
      setVentas(ventasArr);
      setTicket(ventasArr.slice(0,10));

      // KPIs
      const totalVentas = items.reduce((s,i) => s + parseFloat(i.price||0), 0);
      setKpis({
        totalVentas: `R$ ${Math.round(totalVentas).toLocaleString("pt-BR")}`,
        totalOrdenes: items.length.toLocaleString("pt-BR"),
        ticketPromedio: `R$ ${Math.round(totalVentas/items.length)}`,
        topEstado: ventasArr[0]?.estado || "SP"
      });

      // 2. Órdenes por mes
      const mesMap = {};
      const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      items.forEach(item => {
        if (!item.shipping_limit_date) return;
        const f = new Date(item.shipping_limit_date);
        const key = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`;
        const label = `${meses[f.getMonth()]} ${f.getFullYear()}`;
        if (!mesMap[key]) mesMap[key] = { mes:label, key, ordenes:0, ventas:0 };
        mesMap[key].ordenes += 1;
        mesMap[key].ventas += parseFloat(item.price||0);
      });
      setOrdenesMes(Object.values(mesMap).sort((a,b) => a.key.localeCompare(b.key)).slice(-12)
        .map(m => ({ ...m, ventas:Math.round(m.ventas) })));

      // 3. Categorías
      const catMap = {};
      items.forEach(item => {
        const cat = prodMap[item.product_id];
        if (!cat || cat==="other") return;
        if (!catMap[cat]) catMap[cat] = { categoria:cat, total_ventas:0 };
        catMap[cat].total_ventas += parseFloat(item.price||0);
      });
      setCategorias(Object.values(catMap).sort((a,b) => b.total_ventas - a.total_ventas).slice(0,10)
        .map(c => ({ ...c, total_ventas:Math.round(c.total_ventas) })));

      // 4. Reviews
      const revMap = {};
      reviewData.forEach(r => {
        if(!revMap[r.review_score]) revMap[r.review_score] = { name:`⭐ ${r.review_score} estrellas`, value:0 };
        revMap[r.review_score].value += 1;
      });
      setReviews(Object.values(revMap).sort((a,b) => a.name.localeCompare(b.name)));

      // 5. Pagos
      const labels = { credit_card:"Tarjeta Crédito", boleto:"Boleto", voucher:"Voucher", debit_card:"Débito" };
      const pagMap = {};
      pagData.forEach(p => {
        const t = labels[p.payment_type]||p.payment_type;
        if(!pagMap[t]) pagMap[t] = { name:t, value:0 };
        pagMap[t].value += 1;
      });
      setPagos(Object.values(pagMap).sort((a,b) => b.value - a.value));

    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  const tt = { contentStyle:{ background:"#1e293b", border:"1px solid #475569", color:"#f1f5f9" } };

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", color:"#f1f5f9", fontFamily:"Inter, sans-serif" }}>
      <header style={{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"16px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#38bdf8" }}>🛒 Olist Data Warehouse</h1>
            <p style={{ margin:0, fontSize:13, color:"#94a3b8" }}>E-commerce Brasileño · Sistema de Datos en Tiempo Real</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[{id:"dashboard",label:"📊 Dashboard"},{id:"info",label:"ℹ️ Sistema"}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer",
                background: tab===t.id ? "#38bdf8":"#334155",
                color: tab===t.id ? "#0f172a":"#f1f5f9",
                fontWeight: tab===t.id ? 700:400, fontSize:13
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1300, margin:"0 auto", padding:"32px 24px" }}>
        {tab === "dashboard" && (
          <>
            <h2 style={{ color:"#e2e8f0", marginTop:0, marginBottom:20 }}>📈 Métricas del Negocio</h2>

            {loading && <p style={{ color:"#94a3b8", textAlign:"center", padding:80 }}>⏳ Cargando datos desde Supabase...</p>}
            {error   && <p style={{ color:"#f87171", textAlign:"center", padding:20 }}>❌ {error}</p>}

            {!loading && !error && (
              <>
                {/* KPIs */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
                  <KPI icon="💰" label="Total Ventas" value={kpis.totalVentas} color="#38bdf8" />
                  <KPI icon="📦" label="Total Órdenes" value={kpis.totalOrdenes} color="#a78bfa" />
                  <KPI icon="🎫" label="Ticket Promedio" value={kpis.ticketPromedio} color="#34d399" />
                  <KPI icon="🏆" label="Estado Top" value={kpis.topEstado} color="#fbbf24" />
                </div>

                {/* Fila 1 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="📍 Ventas por Estado" subtitle="Volumen de ventas (R$) agrupado por estado de Brasil">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ventas} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="estado" tick={{ fill:"#94a3b8", fontSize:11 }} />
                        <YAxis tick={{ fill:"#94a3b8", fontSize:10 }} />
                        <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                        <Bar dataKey="total_ventas" fill="#38bdf8" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="🎫 Ticket Promedio por Estado" subtitle="Precio promedio por orden en cada estado">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ticket} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="estado" tick={{ fill:"#94a3b8", fontSize:11 }} />
                        <YAxis tick={{ fill:"#94a3b8", fontSize:10 }} />
                        <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ticket promedio"]} />
                        <Bar dataKey="ticket_promedio" fill="#34d399" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 2 - Órdenes por mes (ancho completo) */}
                <div style={{ marginBottom:24 }}>
                  <Card title="📦 Órdenes y Ventas por Mes" subtitle="Evolución mensual de cantidad de órdenes y ventas totales">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={ordenesMes} margin={{ top:10, right:30, left:0, bottom:5 }}>
                        <defs>
                          <linearGradient id="gOrdenes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="mes" tick={{ fill:"#94a3b8", fontSize:11 }} />
                        <YAxis yAxisId="left" tick={{ fill:"#94a3b8", fontSize:10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill:"#94a3b8", fontSize:10 }} />
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:"#94a3b8", fontSize:12 }} />
                        <Area yAxisId="left" type="monotone" dataKey="ordenes" stroke="#38bdf8" fill="url(#gOrdenes)" name="Órdenes" strokeWidth={2} />
                        <Area yAxisId="right" type="monotone" dataKey="ventas" stroke="#a78bfa" fill="url(#gVentas)" name="Ventas R$" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 3 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="⭐ Distribución de Reseñas" subtitle="Satisfacción de clientes (scores del 1 al 5)">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={reviews} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`}>
                          {reviews.map((_,i) => <Cell key={i} fill={C_REVIEWS[i]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:"#94a3b8", fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="💳 Métodos de Pago" subtitle="Distribución de tipos de pago utilizados">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pagos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`}>
                          {pagos.map((_,i) => <Cell key={i} fill={C_PAGOS[i%C_PAGOS.length]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:"#94a3b8", fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 4 - Categorías */}
                <Card title="🏷️ Top Categorías de Productos" subtitle="Ventas totales por categoría (top 10)">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categorias} layout="vertical" margin={{ top:5, right:20, left:100, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill:"#94a3b8", fontSize:11 }} />
                      <YAxis dataKey="categoria" type="category" tick={{ fill:"#94a3b8", fontSize:11 }} width={100} />
                      <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                      <Bar dataKey="total_ventas" fill="#a78bfa" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </>
        )}

        {tab === "info" && (
          <div style={{ background:"#1e293b", borderRadius:12, padding:32, border:"1px solid #334155", maxWidth:750 }}>
            <h2 style={{ color:"#38bdf8", marginTop:0 }}>ℹ️ Sobre el Sistema</h2>
            <p style={{ color:"#94a3b8", lineHeight:1.8 }}>
              Sistema <strong style={{color:"#f1f5f9"}}>Data Warehouse</strong> construido sobre el dataset de e-commerce brasileño <strong style={{color:"#f1f5f9"}}>Olist</strong>, que contiene transacciones reales de más de 100,000 órdenes.
            </p>
            <h3 style={{ color:"#e2e8f0" }}>🏗️ Arquitectura del Sistema</h3>
            <ul style={{ color:"#94a3b8", lineHeight:2.2 }}>
              <li><strong style={{color:"#38bdf8"}}>Agente TCP</strong> — Envía registros del CSV línea por línea por socket confiable (puerto 12000)</li>
              <li><strong style={{color:"#a78bfa"}}>Agente UDP</strong> — Envía telemetría aleatoria en tiempo real cada 0.5s (puerto 12001)</li>
              <li><strong style={{color:"#34d399"}}>Servidor Concurrente</strong> — Recibe TCP+UDP simultáneamente usando hilos (threading)</li>
              <li><strong style={{color:"#fb923c"}}>Supabase</strong> — Base de datos PostgreSQL en la nube con 7 tablas y +14,000 registros</li>
              <li><strong style={{color:"#f472b6"}}>FastAPI</strong> — API REST con endpoints /api/datos, /api/ventas-estado, /api/categorias</li>
              <li><strong style={{color:"#fbbf24"}}>React + Recharts</strong> — Dashboard web con 6 gráficas interactivas desplegado en Vercel</li>
            </ul>
            <h3 style={{ color:"#e2e8f0" }}>📊 Métricas Estratégicas</h3>
            <ul style={{ color:"#94a3b8", lineHeight:2.2 }}>
              <li>¿Cuál es el volumen de ventas por estado geográfico de Brasil?</li>
              <li>¿Cuáles son las categorías de productos con mayores ventas?</li>
              <li>¿Cuál es el ticket promedio por estado?</li>
              <li>¿Cómo evolucionan las órdenes mes a mes?</li>
            </ul>
            <h3 style={{ color:"#e2e8f0" }}>🗄️ Tablas en la Base de Datos</h3>
            <ul style={{ color:"#94a3b8", lineHeight:2.2 }}>
              <li><strong style={{color:"#f1f5f9"}}>customers</strong> — 2,000 clientes con estado y ciudad</li>
              <li><strong style={{color:"#f1f5f9"}}>order_items</strong> — 3,000 items con precios y vendedores</li>
              <li><strong style={{color:"#f1f5f9"}}>order_payments</strong> — 3,000 pagos con tipo y valor</li>
              <li><strong style={{color:"#f1f5f9"}}>order_reviews</strong> — 3,000 reseñas con scores</li>
              <li><strong style={{color:"#f1f5f9"}}>products</strong> — 2,000 productos con categorías</li>
              <li><strong style={{color:"#f1f5f9"}}>sellers</strong> — 1,000 vendedores por estado</li>
              <li><strong style={{color:"#f1f5f9"}}>datos_recibidos</strong> — Registros TCP/UDP en tiempo real</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}