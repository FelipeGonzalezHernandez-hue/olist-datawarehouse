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

// Paleta principal
const BG_PAGE   = "#030d1a";
const BG_HEADER = "#051428";
const BG_CARD   = "#071e38";
const BORDER    = "#0e3a6e";
const TEXT_PRI  = "#ffffff";
const TEXT_SEC  = "#7ab3e0";

// Colores accesibles para gráficas (NO monocromáticos)
const C_BARS    = ["#f97316","#22d3ee","#a3e635","#f43f5e","#facc15","#c084fc","#34d399","#fb7185"];
const C_REVIEWS = ["#f43f5e","#f97316","#facc15","#a3e635","#22d3ee"];
const C_PAGOS   = ["#22d3ee","#f97316","#a3e635","#f43f5e"];
const C_AREA1   = "#22d3ee";
const C_AREA2   = "#f97316";

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
    <div style={{ background:"#041020", borderRadius:12, padding:"18px 22px", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ fontSize:26, background:"#0a2a4a", borderRadius:10, padding:"8px 10px" }}>{icon}</div>
      <div>
        <p style={{ margin:0, color:TEXT_SEC, fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>{label}</p>
        <p style={{ margin:0, color:color||TEXT_PRI, fontSize:20, fontWeight:700 }}>{value}</p>
      </div>
    </div>
  );
}

const TABS = [
  { id:"dashboard", label:"📊 Dashboard" },
  { id:"tabla",     label:"📋 Tabla Dinámica" },
  { id:"info",      label:"ℹ️ Sistema" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [ventas, setVentas]       = useState([]);
  const [ticket, setTicket]       = useState([]);
  const [ordenesMes, setOrdenesMes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [pagos, setPagos]         = useState([]);
  const [tablaData, setTablaData] = useState([]);
  const [kpis, setKpis] = useState({ totalVentas:"...", totalOrdenes:"...", ticketPromedio:"...", topEstado:"..." });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [busqueda, setBusqueda]   = useState("");
  const [ordenCol, setOrdenCol]   = useState("total_ventas");
  const [ordenDir, setOrdenDir]   = useState("desc");

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true); setError(null);
    try {
      const sellers      = await fetchTable("sellers","seller_id,seller_state,seller_city");
      const items        = await fetchTable("order_items","seller_id,product_id,price,order_id,shipping_limit_date,freight_value");
      const products     = await fetchTable("products","product_id,product_category_name",3000);
      const translations = await fetchTable("product_category_name_translation","*");
      const reviewData   = await fetchTable("order_reviews","review_score,order_id");
      const pagData      = await fetchTable("order_payments","payment_type,payment_value");

      const sellerMap = {};
      sellers.forEach(s => { if(s.seller_state) sellerMap[s.seller_id] = { state:s.seller_state, city:s.seller_city }; });
      const transMap = {};
      translations.forEach(t => { transMap[t.product_category_name] = t.product_category_name_english; });
      const prodMap = {};
      products.forEach(p => {
        prodMap[p.product_id] = (transMap[p.product_category_name]||p.product_category_name||"other").replace(/_/g," ");
      });
      const reviewMap = {};
      reviewData.forEach(r => { reviewMap[r.order_id] = r.review_score; });

      // Ventas + ticket por estado
      const ventasMap = {};
      items.forEach(item => {
        const s = sellerMap[item.seller_id];
        if(!s) return;
        if(!ventasMap[s.state]) ventasMap[s.state] = { estado:s.state, ciudad:s.city||"", total_ventas:0, count:0, flete:0 };
        ventasMap[s.state].total_ventas += parseFloat(item.price||0);
        ventasMap[s.state].flete        += parseFloat(item.freight_value||0);
        ventasMap[s.state].count        += 1;
      });
      const ventasArr = Object.values(ventasMap)
        .sort((a,b)=>b.total_ventas-a.total_ventas).slice(0,12)
        .map(v=>({ estado:v.estado, total_ventas:Math.round(v.total_ventas), ticket_promedio:Math.round(v.total_ventas/v.count), ordenes:v.count, flete_promedio:Math.round(v.flete/v.count) }));
      setVentas(ventasArr);
      setTicket(ventasArr.slice(0,10));

      // Tabla dinámica — por estado con todas las métricas
      setTablaData(ventasArr);

      const totalVentas = items.reduce((s,i)=>s+parseFloat(i.price||0),0);
      setKpis({
        totalVentas:   `R$ ${Math.round(totalVentas).toLocaleString("pt-BR")}`,
        totalOrdenes:  items.length.toLocaleString("pt-BR"),
        ticketPromedio:`R$ ${Math.round(totalVentas/items.length)}`,
        topEstado:     ventasArr[0]?.estado||"SP"
      });

      // Órdenes por mes
      const mesMap = {};
      const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      items.forEach(item => {
        if(!item.shipping_limit_date) return;
        const f = new Date(item.shipping_limit_date);
        const key = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}`;
        const label = `${meses[f.getMonth()]} ${f.getFullYear()}`;
        if(!mesMap[key]) mesMap[key] = { mes:label, key, ordenes:0, ventas:0 };
        mesMap[key].ordenes += 1;
        mesMap[key].ventas  += parseFloat(item.price||0);
      });
      setOrdenesMes(Object.values(mesMap).sort((a,b)=>a.key.localeCompare(b.key)).slice(-12)
        .map(m=>({ ...m, ventas:Math.round(m.ventas) })));

      // Categorías
      const catMap = {};
      items.forEach(item => {
        const cat = prodMap[item.product_id];
        if(!cat||cat==="other") return;
        const catShort = cat.substring(0,18);
        if(!catMap[catShort]) catMap[catShort] = { categoria:catShort, total_ventas:0 };
        catMap[catShort].total_ventas += parseFloat(item.price||0);
      });
      setCategorias(Object.values(catMap).sort((a,b)=>b.total_ventas-a.total_ventas).slice(0,10)
        .map(c=>({ ...c, total_ventas:Math.round(c.total_ventas) })));

      // Reviews
      const revMap = {};
      reviewData.forEach(r => {
        if(!revMap[r.review_score]) revMap[r.review_score] = { name:`⭐ ${r.review_score} estrellas`, value:0 };
        revMap[r.review_score].value += 1;
      });
      setReviews(Object.values(revMap).sort((a,b)=>a.name.localeCompare(b.name)));

      // Pagos
      const labels = { credit_card:"Tarjeta Crédito", boleto:"Boleto", voucher:"Voucher", debit_card:"Débito" };
      const pagMap = {};
      pagData.forEach(p => {
        const t = labels[p.payment_type]||p.payment_type;
        if(!pagMap[t]) pagMap[t] = { name:t, value:0 };
        pagMap[t].value += 1;
      });
      setPagos(Object.values(pagMap).sort((a,b)=>b.value-a.value));

    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  // Tabla dinámica — filtro + ordenamiento
  const tablaFiltrada = tablaData
    .filter(r => r.estado.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a,b) => ordenDir==="asc" ? a[ordenCol]-b[ordenCol] : b[ordenCol]-a[ordenCol]);

  function toggleOrden(col) {
    if(ordenCol===col) setOrdenDir(d => d==="asc"?"desc":"asc");
    else { setOrdenCol(col); setOrdenDir("desc"); }
  }

  const thStyle = (col) => ({
    padding:"10px 14px", textAlign:"left", color: ordenCol===col ? "#22d3ee" : TEXT_SEC,
    fontWeight:600, fontSize:12, borderBottom:`1px solid ${BORDER}`,
    cursor:"pointer", whiteSpace:"nowrap", userSelect:"none",
    background:"#041020"
  });

  const tdStyle = { padding:"10px 14px", color:TEXT_PRI, fontSize:13, borderBottom:`1px solid #0a2a4a` };

  const tt = { contentStyle:{ background:BG_CARD, border:`1px solid ${BORDER}`, color:TEXT_PRI } };

  return (
    <div style={{ minHeight:"100vh", background:BG_PAGE, color:TEXT_PRI, fontFamily:"Inter, sans-serif" }}>

      {/* HEADER */}
      <header style={{ background:BG_HEADER, borderBottom:`2px solid #0e3a6e`, padding:"14px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ background:"#0a3060", borderRadius:10, padding:"8px 12px", fontSize:22, border:`1px solid ${BORDER}` }}>🛒</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:TEXT_PRI }}>Olist Data Warehouse</h1>
              <p style={{ margin:0, fontSize:12, color:TEXT_SEC }}>E-commerce Brasileño · Sistema de Datos en Tiempo Real</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:"8px 16px", borderRadius:8, border:`1px solid ${BORDER}`, cursor:"pointer",
                background: tab===t.id ? "#22d3ee" : "transparent",
                color: tab===t.id ? "#000" : TEXT_SEC,
                fontWeight: tab===t.id ? 700 : 400, fontSize:13, transition:"all 0.2s"
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1300, margin:"0 auto", padding:"28px 24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
              <div style={{ width:4, height:22, background:"#22d3ee", borderRadius:4 }}/>
              <h2 style={{ color:TEXT_PRI, margin:0, fontSize:18 }}>Métricas del Negocio</h2>
            </div>

            {loading && <p style={{ color:TEXT_SEC, textAlign:"center", padding:80, fontSize:16 }}>⏳ Cargando datos...</p>}
            {error   && <p style={{ color:"#f43f5e", textAlign:"center", padding:20 }}>❌ {error}</p>}

            {!loading && !error && (
              <>
                {/* KPIs */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
                  <KPI icon="💰" label="Total Ventas"    value={kpis.totalVentas}    color="#22d3ee" />
                  <KPI icon="📦" label="Total Órdenes"   value={kpis.totalOrdenes}   color="#a3e635" />
                  <KPI icon="🎫" label="Ticket Promedio" value={kpis.ticketPromedio} color="#f97316" />
                  <KPI icon="🏆" label="Estado Top"      value={kpis.topEstado}      color="#facc15" />
                </div>

                {/* Fila 1 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="📍 Ventas por Estado" subtitle="Volumen total de ventas (R$) por estado de Brasil">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ventas} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="estado" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} formatter={v=>[`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                        <Bar dataKey="total_ventas" radius={[4,4,0,0]}>
                          {ventas.map((_,i) => <Cell key={i} fill={C_BARS[i % C_BARS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="🎫 Ticket Promedio por Estado" subtitle="Precio promedio por orden en cada estado">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ticket} margin={{ top:10, right:10, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="estado" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} formatter={v=>[`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ticket promedio"]} />
                        <Bar dataKey="ticket_promedio" radius={[4,4,0,0]}>
                          {ticket.map((_,i) => <Cell key={i} fill={C_BARS[(i+3) % C_BARS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 2 — Área */}
                <div style={{ marginBottom:24 }}>
                  <Card title="📦 Órdenes y Ventas por Mes" subtitle="Evolución mensual — línea cyan = órdenes · línea naranja = ventas">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={ordenesMes} margin={{ top:10, right:30, left:0, bottom:5 }}>
                        <defs>
                          <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C_AREA1} stopOpacity={0.35}/>
                            <stop offset="95%" stopColor={C_AREA1} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C_AREA2} stopOpacity={0.35}/>
                            <stop offset="95%" stopColor={C_AREA2} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="mes" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                        <YAxis yAxisId="left"  tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill:TEXT_SEC, fontSize:10 }} />
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                        <Area yAxisId="left"  type="monotone" dataKey="ordenes" stroke={C_AREA1} fill="url(#gO)" name="Órdenes"   strokeWidth={2.5} dot={{ fill:C_AREA1, r:3 }} />
                        <Area yAxisId="right" type="monotone" dataKey="ventas"  stroke={C_AREA2} fill="url(#gV)" name="Ventas R$" strokeWidth={2.5} dot={{ fill:C_AREA2, r:3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 3 — Pie charts */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginBottom:24 }}>
                  <Card title="⭐ Distribución de Reseñas" subtitle="Satisfacción de clientes — del 1 al 5 estrellas">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={reviews} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={{ stroke:TEXT_SEC }}>
                          {reviews.map((_,i) => <Cell key={i} fill={C_REVIEWS[i]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="💳 Métodos de Pago" subtitle="Distribución de tipos de pago utilizados por clientes">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pagos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={{ stroke:TEXT_SEC }}>
                          {pagos.map((_,i) => <Cell key={i} fill={C_PAGOS[i%C_PAGOS.length]} />)}
                        </Pie>
                        <Tooltip {...tt} />
                        <Legend wrapperStyle={{ color:TEXT_SEC, fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Fila 4 — Categorías */}
                <Card title="🏷️ Top Categorías de Productos" subtitle="Ventas totales (R$) por categoría — top 10">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categorias} layout="vertical" margin={{ top:5, right:20, left:110, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis type="number" tick={{ fill:TEXT_SEC, fontSize:11 }} />
                      <YAxis dataKey="categoria" type="category" tick={{ fill:TEXT_SEC, fontSize:11 }} width={110} />
                      <Tooltip {...tt} formatter={v=>[`R$ ${Number(v).toLocaleString("pt-BR")}`, "Ventas"]} />
                      <Bar dataKey="total_ventas" radius={[0,4,4,0]}>
                        {categorias.map((_,i) => <Cell key={i} fill={C_BARS[i % C_BARS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </>
        )}

        {/* ── TABLA DINÁMICA ── */}
        {tab === "tabla" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
              <div style={{ width:4, height:22, background:"#22d3ee", borderRadius:4 }}/>
              <h2 style={{ color:TEXT_PRI, margin:0, fontSize:18 }}>Tabla Dinámica — Ventas por Estado</h2>
            </div>

            <div style={{ background:BG_CARD, borderRadius:12, border:`1px solid ${BORDER}`, overflow:"hidden" }}>
              {/* Barra de búsqueda */}
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ margin:0, color:TEXT_SEC, fontSize:13 }}>
                  Haz clic en los encabezados para ordenar · {tablaFiltrada.length} estados
                </p>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar estado..."
                  style={{
                    background:"#041020", border:`1px solid ${BORDER}`, borderRadius:8,
                    padding:"8px 14px", color:TEXT_PRI, fontSize:13, width:200, outline:"none"
                  }}
                />
              </div>

              {/* Tabla */}
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle("estado")} onClick={() => toggleOrden("estado")}>
                        Estado {ordenCol==="estado" ? (ordenDir==="asc"?"↑":"↓") : "↕"}
                      </th>
                      <th style={thStyle("total_ventas")} onClick={() => toggleOrden("total_ventas")}>
                        Total Ventas {ordenCol==="total_ventas" ? (ordenDir==="asc"?"↑":"↓") : "↕"}
                      </th>
                      <th style={thStyle("ordenes")} onClick={() => toggleOrden("ordenes")}>
                        Órdenes {ordenCol==="ordenes" ? (ordenDir==="asc"?"↑":"↓") : "↕"}
                      </th>
                      <th style={thStyle("ticket_promedio")} onClick={() => toggleOrden("ticket_promedio")}>
                        Ticket Promedio {ordenCol==="ticket_promedio" ? (ordenDir==="asc"?"↑":"↓") : "↕"}
                      </th>
                      <th style={thStyle("flete_promedio")} onClick={() => toggleOrden("flete_promedio")}>
                        Flete Promedio {ordenCol==="flete_promedio" ? (ordenDir==="asc"?"↑":"↓") : "↕"}
                      </th>
                      <th style={{ ...thStyle(""), cursor:"default" }}>Participación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign:"center", padding:40, color:TEXT_SEC }}>⏳ Cargando...</td></tr>
                    )}
                    {!loading && tablaFiltrada.map((row, i) => {
                      const maxVentas = tablaData[0]?.total_ventas || 1;
                      const pct = Math.round((row.total_ventas / maxVentas) * 100);
                      return (
                        <tr key={row.estado}
                          style={{ background: i%2===0 ? "transparent" : "#041020" }}
                          onMouseEnter={e => e.currentTarget.style.background="#0a2a4a"}
                          onMouseLeave={e => e.currentTarget.style.background=i%2===0?"transparent":"#041020"}
                        >
                          <td style={tdStyle}>
                            <span style={{ background:"#0a3060", padding:"3px 10px", borderRadius:6, fontWeight:700, color:"#22d3ee", fontSize:13 }}>
                              {row.estado}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color:"#a3e635", fontWeight:600 }}>
                            R$ {row.total_ventas.toLocaleString("pt-BR")}
                          </td>
                          <td style={{ ...tdStyle, color:"#22d3ee" }}>{row.ordenes}</td>
                          <td style={{ ...tdStyle, color:"#f97316" }}>
                            R$ {row.ticket_promedio.toLocaleString("pt-BR")}
                          </td>
                          <td style={{ ...tdStyle, color:"#facc15" }}>
                            R$ {row.flete_promedio.toLocaleString("pt-BR")}
                          </td>
                          <td style={{ ...tdStyle, minWidth:140 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ flex:1, background:"#0a2a4a", borderRadius:4, height:8 }}>
                                <div style={{ width:`${pct}%`, background:"#22d3ee", borderRadius:4, height:8, transition:"width 0.3s" }}/>
                              </div>
                              <span style={{ color:TEXT_SEC, fontSize:11, minWidth:32 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ padding:"12px 20px", borderTop:`1px solid ${BORDER}`, color:TEXT_SEC, fontSize:12 }}>
                Total de registros: {tablaFiltrada.length} estados · Haz clic en columnas para ordenar
              </div>
            </div>
          </>
        )}

        {/* ── INFO ── */}
        {tab === "info" && (
          <div style={{ background:BG_CARD, borderRadius:12, padding:32, border:`1px solid ${BORDER}`, maxWidth:750 }}>
            <h2 style={{ color:"#22d3ee", marginTop:0 }}>ℹ️ Sobre el Sistema</h2>
            <p style={{ color:TEXT_SEC, lineHeight:1.8 }}>
              Sistema <strong style={{color:TEXT_PRI}}>Data Warehouse</strong> construido sobre el dataset de e-commerce brasileño <strong style={{color:TEXT_PRI}}>Olist</strong>, con transacciones reales de más de 100,000 órdenes.
            </p>
            <h3 style={{ color:TEXT_PRI, borderBottom:`1px solid ${BORDER}`, paddingBottom:8 }}>🏗️ Arquitectura</h3>
            <ul style={{ color:TEXT_SEC, lineHeight:2.4 }}>
              <li><strong style={{color:"#22d3ee"}}>Agente TCP</strong> — Socket SOCK_STREAM, puerto 12000, envía CSV línea por línea con pausa de 1s</li>
              <li><strong style={{color:"#f97316"}}>Agente UDP</strong> — Socket SOCK_DGRAM, puerto 12001, telemetría aleatoria cada 0.5s</li>
              <li><strong style={{color:"#a3e635"}}>Servidor Concurrente</strong> — Recibe TCP+UDP simultáneamente con hilos (threading)</li>
              <li><strong style={{color:"#facc15"}}>Supabase</strong> — PostgreSQL en la nube, 7 tablas, +14,000 registros</li>
              <li><strong style={{color:"#c084fc"}}>FastAPI</strong> — API REST: /api/datos, /api/ventas-estado, /api/categorias, /api/reviews, /api/pagos</li>
              <li><strong style={{color:"#f43f5e"}}>React + Recharts</strong> — Dashboard con 6 gráficas + tabla dinámica, desplegado en Vercel</li>
            </ul>
            <h3 style={{ color:TEXT_PRI, borderBottom:`1px solid ${BORDER}`, paddingBottom:8 }}>📊 Métricas Estratégicas</h3>
            <ul style={{ color:TEXT_SEC, lineHeight:2.4 }}>
              <li>¿Cuál es el volumen de ventas por estado geográfico de Brasil?</li>
              <li>¿Cuáles son las categorías de productos con mayores ventas?</li>
              <li>¿Cuál es el ticket promedio de compra por estado?</li>
              <li>¿Cómo evolucionan las órdenes y ventas mes a mes?</li>
            </ul>
            <h3 style={{ color:TEXT_PRI, borderBottom:`1px solid ${BORDER}`, paddingBottom:8 }}>🗄️ Tablas en Supabase</h3>
            <ul style={{ color:TEXT_SEC, lineHeight:2.4 }}>
              <li><strong style={{color:TEXT_PRI}}>customers</strong> — 2,000 clientes</li>
              <li><strong style={{color:TEXT_PRI}}>order_items</strong> — 3,000 items con precios y fletes</li>
              <li><strong style={{color:TEXT_PRI}}>order_payments</strong> — 3,000 pagos</li>
              <li><strong style={{color:TEXT_PRI}}>order_reviews</strong> — 3,000 reseñas</li>
              <li><strong style={{color:TEXT_PRI}}>products</strong> — 2,000 productos</li>
              <li><strong style={{color:TEXT_PRI}}>sellers</strong> — 1,000 vendedores</li>
              <li><strong style={{color:TEXT_PRI}}>datos_recibidos</strong> — Registros TCP/UDP en tiempo real</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
