import { useState, useEffect } from "react";
import VentasEstado from "./components/VentasEstado";
import VentasCategorias from "./components/VentasCategorias";
import Reviews from "./components/Reviews";
import Pagos from "./components/Pagos";
import TablaDatos from "./components/TablaDatos";
import Telemetria from "./components/Telemetria";

// 🔧 Cambia esta URL por la de tu API desplegada en Render/Railway
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "datos",     label: "📋 Datos en Vivo" },
    { id: "telemetria",label: "📡 Telemetría UDP" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "Inter, sans-serif" }}>
      
      {/* ── HEADER ── */}
      <header style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#38bdf8" }}>
              🛒 Olist Data Warehouse
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
              E-commerce Brasileño · Sistema de Datos en Tiempo Real
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: activeTab === t.id ? "#38bdf8" : "#334155",
                  color: activeTab === t.id ? "#0f172a" : "#f1f5f9",
                  fontWeight: activeTab === t.id ? 700 : 400,
                  fontSize: 13, transition: "all 0.2s"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        
        {activeTab === "dashboard" && (
          <>
            <h2 style={{ color: "#e2e8f0", marginTop: 0, marginBottom: 24 }}>📈 Métricas del Negocio</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <VentasEstado apiUrl={API_URL} />
              <VentasCategorias apiUrl={API_URL} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Reviews apiUrl={API_URL} />
              <Pagos apiUrl={API_URL} />
            </div>
          </>
        )}

        {activeTab === "datos" && (
          <>
            <h2 style={{ color: "#e2e8f0", marginTop: 0, marginBottom: 24 }}>📋 Últimos Datos Recibidos</h2>
            <TablaDatos apiUrl={API_URL} />
          </>
        )}

        {activeTab === "telemetria" && (
          <>
            <h2 style={{ color: "#e2e8f0", marginTop: 0, marginBottom: 24 }}>📡 Telemetría en Tiempo Real (UDP)</h2>
            <Telemetria apiUrl={API_URL} />
          </>
        )}

      </main>
    </div>
  );
}
