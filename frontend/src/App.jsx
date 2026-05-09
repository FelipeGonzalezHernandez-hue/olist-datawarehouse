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

// Paleta: Negro + Azules oscuros + Blanco
const BG_PAGE   = "#000000";
const BG_HEADER = "#020c1b";
const BG_CARD   = "#0a1628";
const BG_CARD2  = "#071020";
const BORDER    = "#1a3a5c";
const TEXT_PRI  = "#ffffff";
const TEXT_SEC  = "#7aa4c8";
const ACCENT1   = "#1d6fa4";
const ACCENT2   = "#2a9fd6";
const ACCENT3   = "#0d4f7a";
const ACCENT4   = "#3bbfff";

const C_REVIEWS = ["#1a4a7a","#1d6fa4","#2a9fd6","#3bbfff","#7dd4ff"];
const C_PAGOS   = ["#2a9fd6","#1d6fa4","#0d4f7a","#3bbfff"];

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background:BG_CARD, borderRadius:12, padding:20, border:`1px solid ${BORDER}` }}>
      <h3 style={{ margin:"0 0 4px", color:TEXT_PRI, fontSize:16, fontWeight:600 }}>{title}</h3>
      <p style={{ margin:"0 0 16px", color:TEXT_SEC, fontSize:12 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function KPI({ icon, label, value, color }) {
  return (
    <div style={{ background:BG_CARD2, borderRadius:12, padding:"18px 22px", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ fontSize:28, background:ACCENT3, borderRadius:10, padding:"8px 10px" }}>{icon}</div>
      <div>
        <p style={{ margin:0, color:TEXT_SEC, fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>{label}</p>
        <p style={{ margin:0, color: color||TEXT_PRI, fontSize:20, fontWeight:700 }}>{value}</p>
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

      const sellerMap = {};
      sellers.forEach(s => { if(s.seller_state) sellerMap[s.seller_id] = s.seller_state; });
      const transMap = {};
      translations.forEach(t => { transMap[t.product_category_name] = t.product_category_name_english; });
      const prodMap = {};
      products.forEach(p => {
        prodMap[p.product_id] = (transMap[p.product_category_name] || p.product_category_name || "other")
          .replace(/_/g," ").substring(0,18);
      });

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

      const totalVentas = items.reduce((s,i) => s + parseFloat(i.price||0), 0);
      setKpis({
        totalVentas: `R$ ${Math.round(totalVentas).toLocaleString("pt-BR")}`,
        totalOrdenes: items.length.toLocaleString("pt-BR"),
        ticketPromedio: `R$ ${Math.round(totalVentas/items.length)}`,
        topEstado: ventasArr[0]?.estado || "SP"
      });

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

      const catMap = {};
      items.forEach(item => {
        const cat = prodMap[item.product_id];
        if (!cat || cat==="other") return;
        if (!catMap[cat]) catMap[cat] = { categoria:cat, total_ventas:0 };
        catMap[cat].total_ventas += parseFloat(item.price||0);
      });
      setCategorias(Object.values(catMap).sort((a,b) => b.total_ventas - a.total_ventas).slice(0,10)
        .map(c => ({ ...c, total_ventas:Math.round(c.total_ventas) })));

      const revMap = {};
      reviewData.forEach(r => {
        if(!revMap[r.review_score]) revMap[r.review_score] = { name:`⭐ ${r.review_score} estrellas`, value:0 };
        revMap[r.review_score].value += 1;
      });
      setReviews(Object.values(revMap).sort((a,b) => a.name.localeCompare(b.name)));

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

  const tt = { contentStyle:{ background:BG_CARD, border:`1px solid ${BORDER}`, color:TEXT_PRI } };

  return (
    <div style={{ minHeight:"100vh", background:BG_PAGE, color:TEXT_PRI, fontFamily:"Inter, sans-serif" }}>
      <header style={{ background:BG_HEADER, borderBottom:`1px solid ${BORDER}`, padding:"16px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ background:ACCENT1, borderRadius:10, padding:"8px 12px", fontSize:22 }}>🛒</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:TEXT_PRI, letterSpacing:0.5 }}>Olist Data Warehouse</h1>
              <p style={{ margin:0, fontSize:12, color:TEXT_SEC }}>E-commerce Brasileño · Sistema de Datos en Tiempo Real</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[{id:"dashboard",label:"📊 Dashboard"},{id:"info",label:"ℹ️ Sistema"}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:"8px 18px", borderRadius:8, border:`1px solid ${BORDER}`, cursor:"pointer",
                background: tab===t.id ? ACCENT2 : "transparent",
                color: tab===t.id ? "#000" : TEXT_SEC,
                fontWeight: tab===t.id ? 700 : 400, fontSize:13, transition:"all 0.2s"
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1300, margin:"0 auto", padding:"32px 24px" }}>
        {tab === "dashboard" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <div style={{ width:4, height:24, background:ACCENT2, borderRadius:4 }}/>
              <h2 style={{ color:TEXT_PRI, margin:0, fontSize:20 }}>Métricas del Negocio</h2>
            </div>

            {loading && (
              <div style={{ textAlign:"center", padding:80 }}>
                <p style={{ color:TEXT_SEC, fontSize:16 }}>⏳ Cargando datos desde Supabase...</p>
              </div>
            )}
            {error && <p style={{ color:"#f87171", textAlign:"center", padding:20 }}>❌ {error}</p>}

            {!loading && !error && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
                  <KPI icon="💰" label="Total Ventas" value={kpis.totalVentas} color={ACCENT4} />
                  <KPI icon="📦" label="Total Órdenes" value={kpis.totalOrdenes} color="#ffffff" />
                  <KPI icon="🎫" label="Ticket Promedio" value={kpis.ticketPromedio} color={ACCENT4} />
                  <KPI icon="🏆" label="Estado Top" value={kpis.topEstado} color="#ffffff" />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="📍 Ventas por Estado" subtitle="Volumen de ventas (R$) agrupado por estado de Brasil">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ventas} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="estado" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                        <Bar dataKey="total_ventas" fill={ACCENT2} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="🎫 Ticket Promedio por Estado" subtitle="Precio promedio por orden en cada estado">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ticket} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="estado" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ticket promedio"]} />
                        <Bar dataKey="ticket_promedio" fill={ACCENT1} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <div style={{ marginBottom:24 }}>
                  <Card title="📦 Órdenes y Ventas por Mes" subtitle="Evolución mensual de cantidad de órdenes y ventas totales">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={ordenesMes} margin={{ top:10, right:30, left:0, bottom:5 }}>
                        <defs>
                          <linearGradient id="gOrdenes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ACCENT2} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={ACCENT2} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ACCENT4} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={ACCENT4} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="mes" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis yAxisId="left" tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                        <Area yAxisId="left" type="monotone" dataKey="ordenes" stroke={ACCENT2} fill="url(#gOrdenes)" name="Órdenes" strokeWidth={2} />
                        <Area yAxisId="right" type="monotone" dataKey="ventas" stroke={ACCENT4} fill="url(#gVentas)" name="Ventas R$" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="⭐ Distribución de Reseñas" subtitle="Satisfacción de clientes (scores del 1 al 5)">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={reviews} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`} labelLine={{ stroke:TEXT_SEC }}>
                          {reviews.map((_,i) => <Cell key={i} fill={C_REVIEWS[i]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="💳 Métodos de Pago" subtitle="Distribución de tipos de pago utilizados">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pagos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent}) => `${(percent*100).toFixed(0)}%`} labelLine={{ stroke:TEXT_SEC }}>
                          {pagos.map((_,i) => <Cell key={i} fill={C_PAGOS[i%C_PAGOS.length]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <Card title="🏷️ Top Categorías de Productos" subtitle="Ventas totales por categoría (top 10)">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categorias} layout="vertical" margin={{ top:5, right:20, left:100, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis type="number" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                      <YAxis dataKey="categoria" type="category" tick={{ fill:TEXT_SEC, fontSize:11 }} width={100} />
                      <Tooltip {...tt} formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                      <Bar dataKey="total_ventas" fill={ACCENT3} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </>
        )}

        {tab === "info" && (
          <div style={{ background:BG_CARD, borderRadius:12, padding:32, border:`1px solid ${BORDER}`, maxWidth:750 }}>
            <h2 style={{ color:ACCENT4, marginTop:0 }}>ℹ️ Sobre el Sistema</h2>
            <p style={{ color:TEXT_SEC, lineHeight:1.8 }}>
              Sistema <strong style={{color:TEXT_PRI}}>Data Warehouse</strong> construido sobre el dataset de e-commerce brasileño <strong style={{color:TEXT_PRI}}>Olist</strong>, que contiene transacciones reales de más de 100,000 órdenes.
            </p>
            <h3 style={{ color:TEXT_PRI }}>🏗️ Arquitectura del Sistema</h3>
            <ul style={{ color:TEXT_SEC, lineHeight:2.2 }}>
              <li><strong style={{color:ACCENT4}}>Agente TCP</strong> — Envía registros del CSV línea por línea por socket confiable (puerto 12000)</li>
              <li><strong style={{color:ACCENT4}}>Agente UDP</strong> — Envía telemetría aleatoria en tiempo real cada 0.5s (puerto 12001)</li>
              <li><strong style={{color:ACCENT4}}>Servidor Concurrente</strong> — Recibe TCP+UDP simultáneamente usando hilos (threading)</li>
              <li><strong style={{color:ACCENT4}}>Supabase</strong> — Base de datos PostgreSQL en la nube con 7 tablas y +14,000 registros</li>
              <li><strong style={{color:ACCENT4}}>FastAPI</strong> — API REST con endpoints /api/datos, /api/ventas-estado, /api/categorias</li>
              <li><strong style={{color:ACCENT4}}>React + Recharts</strong> — Dashboard web con 6 gráficas interactivas desplegado en Vercel</li>
            </ul>
            <h3 style={{ color:TEXT_PRI }}>📊 Métricas Estratégicas</h3>
            <ul style={{ color:TEXT_SEC, lineHeight:2.2 }}>
              <li>¿Cuál es el volumen de ventas por estado geográfico de Brasil?</li>
              <li>¿Cuáles son las categorías de productos con mayores ventas?</li>
              <li>¿Cuál es el ticket promedio por estado?</li>
              <li>¿Cómo evolucionan las órdenes mes a mes?</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
