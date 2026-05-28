/**
 * Componente Principal Dashboard
 * 
 * Renderiza el panel de control inicial con métricas (KPIs), gráficas de ventas, 
 * y la sección de Inteligencia de Negocio que evalúa estrategias de venta
 * cruzando datos del Random Forest (Machine Learning) con las ventas históricas.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { 
  FaBagShopping, FaChartLine, FaTriangleExclamation, FaBrain, 
  FaCalendarDays, FaHandSparkles, FaCircleArrowUp, FaCircleArrowDown,
  FaTag, FaLightbulb, FaBullhorn
} from 'react-icons/fa6';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import Swal from 'sweetalert2';
import '../assets/styles/dashboard.css';

const COLORS = ['#b45309', '#d97706', '#f59e0b', '#8c4f2b', '#5e3019'];

/**
 * Función central de Inteligencia de Negocio.
 * Analiza un producto (basado en ventas pasadas o predicción futura) y determina
 * la mejor estrategia comercial (Descuentos, Combos, Liquidación).
 * 
 * @param {Object} prod - El objeto del producto con su nombre y cantidad calculada.
 * @param {boolean} esPrediccion - Bandera que indica si los datos provienen del modelo IA o de la DB.
 * @returns {Object} Un objeto con el título, badge, color y descripción de la estrategia sugerida.
 */
const obtenerPromocion = (prod, esPrediccion) => {
  const norm = prod.nombre.trim().toLowerCase();
  const cantidad = prod.cantidad || 0;

  let titulo = "Estrategia Dinámica";
  let badge = "Promoción General";
  let color = "badge-general";
  let descripcion = "";
  let detalle = "";

  if (esPrediccion) {
    if (cantidad === 0) {
      titulo = "Alerta de Demanda Cero";
      badge = "Liquidación Urgente / Remate";
      color = "badge-festejo";
      descripcion = `El modelo predictivo indica que no habrá demanda para ${prod.nombre}. Considera pausar su producción temporalmente u ofrecer un 2x1 extremo para liberar inventario.`;
      detalle = `La predicción de Machine Learning para este periodo estima 0 ventas. Producir este artículo generará mermas seguras.`;
    } else if (cantidad < 10) {
      titulo = "Impulso de Baja Demanda";
      badge = "Promo Flash / Combos";
      color = "badge-saludable";
      descripcion = `Aplica un 20% de descuento o crea un combo especial incluyendo ${prod.nombre} con el producto estrella.`;
      detalle = `El modelo proyecta una venta muy baja (${cantidad} unidades). Se requiere una acción promocional agresiva para evitar estancamiento.`;
    } else {
      titulo = "Optimización de Precio";
      badge = "Descuento por Volumen";
      color = "badge-weekend";
      descripcion = `Mantén el stock optimizado para ${cantidad} unidades y ofrece un pequeño descuento (5-10%) a compras por volumen.`;
      detalle = `Proyección estable pero baja. Ajustar levemente el margen en compras grupales acelerará la salida.`;
    }
  } else {
    if (cantidad === 0) {
      titulo = "Producto Estancado";
      badge = "Revisión de Calidad";
      color = "badge-festejo";
      descripcion = `Revisa la calidad, presentación o precio de ${prod.nombre}. Considera reemplazarlo o reformularlo.`;
      detalle = `Los datos históricos muestran 0 ventas en el periodo seleccionado. Mantener este producto en vitrina genera pérdidas de espacio.`;
    } else {
      titulo = "Rotación Lenta Histórica";
      badge = "Estrategia de Vitrina";
      color = "badge-general";
      descripcion = `Ubicación estratégica: Coloca ${prod.nombre} cerca de la caja registradora u ofrécelo como 'upsell' por un extra de S/ 1.00.`;
      detalle = `Históricamente, este producto vende solo ${cantidad} uds en este periodo. Mejorar su visibilidad física suele incrementar sus ventas.`;
    }
  }


  
  return { titulo, badge, color, descripcion, detalle };
};

const cleanName = (name) => {
  if (!name) return '';
  return name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
};

export default function Dashboard() {
  // Manejo de estado principal de la vista
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('05');
  const [user, setUser] = useState({ nombre: 'Administrador' });
  const [activeTab, setActiveTab] = useState('graficos');
  const [kpi, setKpi] = useState({
    ventasHoy: 0,
    ventasTrend: 0,
    productoTop: '-',
    demandaManana: 0,
    totalProductos: 0,
    alertas: 0,
    chartTopProductos: [],
    ventasMensuales: [],
    top5: [],
    bottom5: [],
    esPrediccion: false,
  });

  useEffect(() => {
    cargarDatos();
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, [selectedYear, selectedMonth]);

  /**
   * Dispara la consulta al Backend para refrescar los KPIs 
   * cada vez que el usuario cambia de mes o año.
   */
  const cargarDatos = () => {
    apiFetch(`/api/dashboard?year=${selectedYear}&month=${selectedMonth}`)
      .then((r) => r.json())
      .then((data) => {
        setKpi({
          ventasHoy: Number(data.ventasHoy) || 0,
          ventasTrend: Number(data.ventasTrend) || 0,
          productoTop: data.productoTop || '-',
          demandaManana: Number(data.demandaManana) || 0,
          totalProductos: Number(data.totalProductos) || 0,
          alertas: Number(data.alertas) || 0,
          chartTopProductos: data.chartTopProductos || [],
          ventasMensuales: data.ventasMensuales || [],
          top5: data.top5 || [],
          bottom5: data.bottom5 || [],
          esPrediccion: !!data.esPrediccion,
        });

        if (Number(data.alertas) > 0) {
          Swal.fire({
            title: 'Control de Inventario',
            text: `Existen ${data.alertas} insumos con stock bajo mínimos.`,
            icon: 'warning',
            confirmButtonColor: '#b45309',
            toast: true,
            position: 'top-end',
            timer: 4000,
            showConfirmButton: false
          });
        }
      })
      .catch(console.error);
  };

  const meses = [
    { label: 'ENE', val: '01' }, { label: 'FEB', val: '02' }, { label: 'MAR', val: '03' },
    { label: 'ABR', val: '04' }, { label: 'MAY', val: '05' }, { label: 'JUN', val: '06' },
    { label: 'JUL', val: '07' }, { label: 'AGO', val: '08' }, { label: 'SEP', val: '09' },
    { label: 'OCT', val: '10' }, { label: 'NOV', val: '11' }, { label: 'DIC', val: '12' },
  ];

  return (
    <div className="dashboard-container">
      {/* Banner de Bienvenida */}
      <div className="welcome-banner">
        <div className="welcome-left">
          <div className="welcome-text">
            <h1>¡Hola, {cleanName(user.nombre)}! <FaHandSparkles className="dash-sparkle-icon" /></h1>
            <p>Bienvenido al panel de control analítico de Rincón Panadero.</p>
          </div>
          
          {/* Pestañas de Navegación del Dashboard Integradas */}
          <div className="welcome-tabs-container">
            <button 
              className={`welcome-tab-btn ${activeTab === 'graficos' ? 'active' : ''}`}
              onClick={() => setActiveTab('graficos')}
            >
              <FaChartLine className="view-btn-icon" />
              <span>Estadísticas</span>
            </button>
            <button 
              className={`welcome-tab-btn ${activeTab === 'promociones' ? 'active' : ''}`}
              onClick={() => setActiveTab('promociones')}
            >
              <FaBrain className="view-btn-icon" />
              <span>Estrategias de Venta</span>
            </button>
          </div>
        </div>

        <div className="welcome-right">
          <div className="dash-text-right">
            <div className="dash-mini-label">FECHA ACTUAL</div>
            <div className="dash-main-value"><FaCalendarDays /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label"><FaBagShopping className="dash-icon-primary" /> VENTAS DEL PERIODO</div>
          <div className="stat-value">S/ {kpi.ventasHoy.toFixed(2)}</div>
          <div className={`stat-trend ${kpi.ventasTrend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {kpi.ventasTrend >= 0 ? `+${kpi.ventasTrend.toFixed(1)}%` : `${kpi.ventasTrend.toFixed(1)}%`} vs mes anterior
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><FaBrain className="dash-icon-blue" /> PREDICCIÓN DEMANDA</div>
          <div className="stat-value">{kpi.demandaManana} uds</div>
          <div className="dash-text-muted" style={{ fontSize: '0.8rem', marginTop: '8px' }}>Próximas 24 horas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><FaChartLine className="dash-icon-green" /> PRODUCTO ESTRELLA</div>
          <div className="stat-value dash-font-large">{kpi.productoTop}</div>
          <div className="stat-trend trend-up">Alta rotación</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><FaTriangleExclamation style={{ color: kpi.alertas > 0 ? '#ef4444' : '#10b981' }} /> ALERTAS CRÍTICAS</div>
          <div className="stat-value" style={{ color: kpi.alertas > 0 ? '#ef4444' : '#10b981' }}>{kpi.alertas}</div>
          <div className="stat-trend">{kpi.alertas > 0 ? 'Reponer insumos pronto' : 'Stock en niveles óptimos'}</div>
        </div>
      </div>

      <div className="dashboard-main-content">
        {/* Filtros Laterales */}
        <div className="filter-sidebar">
          <div className="filter-group">
            <div className="filter-label">AÑO</div>
            <div className="year-input-container">
              <input 
                type="number" 
                className="premium-year-input"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2000"
                placeholder="Año"
              />
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">MES</div>
            <div className="month-grid">
              {meses.map(m => (
                <button 
                  key={m.val} 
                  className={`filter-btn ${selectedMonth === m.val ? 'active' : ''}`}
                  onClick={() => setSelectedMonth(m.val)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-new dash-full-width-btn" onClick={cargarDatos}>
            ACTUALIZAR
          </button>
        </div>

        {/* Contenido según pestaña activa */}
        <div className="dash-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

          {activeTab === 'graficos' && (
            <div className="charts-grid fade-in">
              {/* Tendencia de Ventas */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">FLUJO DE CAJA MENSUAL</h3>
                  <FaChartLine className="dash-icon-primary" />
                </div>
                <div className="dash-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpi.ventasMensuales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="fecha" fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} />
                      <YAxis fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid var(--border-color)', 
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          boxShadow: 'var(--card-shadow)' 
                        }}
                        labelStyle={{ color: 'var(--text-main)' }}
                        itemStyle={{ color: '#b45309' }}
                      />
                      <Line type="monotone" dataKey="total" stroke="#b45309" strokeWidth={4} dot={{ r: 4, fill: '#b45309' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Productos Bar */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">RANKING DE PRODUCTOS</h3>
                  <FaBagShopping className="dash-icon-green" />
                </div>
                <div className="dash-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={kpi.chartTopProductos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="nombre" type="category" fontSize={11} width={80} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                        labelStyle={{ color: 'var(--text-main)' }}
                        itemStyle={{ color: '#b45309' }}
                      />
                      <Bar dataKey="cantidad" radius={[0, 10, 10, 0]} barSize={20}>
                        {kpi.chartTopProductos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'promociones' && (
            <div className="charts-grid fade-in">
              {/* TOP 5 PRODUCTOS MÁS VENDIDOS */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCircleArrowUp className="dash-icon-green" /> TOP 5: PRODUCTOS MÁS VENDIDOS
                  </h3>
                  <span className={kpi.esPrediccion ? "promo-badge badge-weekend" : "promo-badge badge-general"}>
                    {kpi.esPrediccion ? <><FaBrain /> Proyección IA</> : <><FaChartLine /> Ventas Históricas</>}
                  </span>
                </div>
                <div className="intelligence-list">
                  {kpi.top5 && kpi.top5.length > 0 ? (
                    kpi.top5.map((prod, index) => (
                      <div key={`top-${index}`} className="intelligence-item">
                        <div className="item-rank rank-top">{index + 1}</div>
                        <div className="item-name-group">
                          <span className="item-name">{prod.nombre}</span>
                        </div>
                        <div className="item-qty qty-top">{prod.cantidad.toLocaleString()} uds</div>
                      </div>
                    ))
                  ) : (
                    <div className="dash-text-muted">No hay datos en este periodo</div>
                  )}
                </div>
              </div>

              {/* BOTTOM 5 PRODUCTOS MENOS VENDIDOS Y PROMOCIONES */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCircleArrowDown className="dash-icon-red" /> 5 PRODUCTOS MENOS VENDIDOS
                  </h3>
                  <span className={kpi.esPrediccion ? "promo-badge badge-weekend" : "promo-badge badge-general"}>
                    {kpi.esPrediccion ? <><FaBrain /> Proyección IA</> : <><FaChartLine /> Ventas Históricas</>}
                  </span>
                </div>
                <div className="intelligence-list">
                  {kpi.bottom5 && kpi.bottom5.length > 0 ? (
                    kpi.bottom5.map((prod, index) => {
                      const promo = obtenerPromocion(prod, kpi.esPrediccion);
                      return (
                        <div key={`bottom-${index}`} className="intelligence-item">
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="item-rank rank-bottom">{index + 1}</div>
                            <div className="item-name-group">
                              <span className="item-name">{prod.nombre}</span>
                              <span className="item-sub">Vendido: <strong>{prod.cantidad.toLocaleString()} uds</strong> | Precio: S/ {prod.precio ? prod.precio.toFixed(2) : '0.00'}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-new promo-compact-btn"
                            onClick={() => {
                              Swal.fire({
                                title: `<span style="color:#b45309; font-weight:700;">${promo.titulo}</span>`,
                                html: `
                                  <div style="text-align: left; font-family: var(--font-sans); color: var(--text-main);">
                                    <p style="margin-top: 5px;"><strong>Producto:</strong> ${prod.nombre}</p>
                                    <p><strong>Tipo de Campaña:</strong> <span class="promo-badge ${promo.color}" style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-size:0.8rem;">${promo.badge}</span></p>
                                    
                                    <p style="margin-top: 15px; font-weight: 600; font-size: 0.95rem; color:#b45309; margin-bottom: 5px; display:flex; align-items:center; gap:6px;">
                                      Estrategia Propuesta:
                                    </p>
                                    <div style="background: var(--bg-app, #fbfbfb); border: 1px solid var(--border-color, #e5e7eb); padding: 12px; border-radius: 8px; font-style: italic; font-size:0.9rem; line-height:1.4; color: var(--text-main);">
                                      "${promo.descripcion}"
                                    </div>
                                    
                                    <p style="margin-top: 15px; font-weight: 600; font-size: 0.95rem; color:#b45309; margin-bottom: 5px; display:flex; align-items:center; gap:6px;">
                                      Justificación Analítica (${kpi.esPrediccion ? 'Modelo Predictivo' : 'Datos Históricos'}):
                                    </p>
                                    <p style="font-size: 0.9rem; line-height: 1.4; color: var(--text-muted, #4b5563);">${promo.detalle}</p>
                                  </div>
                                `,
                                icon: 'info',
                                confirmButtonText: 'Entendido',
                                confirmButtonColor: '#b45309',
                                customClass: {
                                  popup: 'promo-popup-swal'
                                }
                              });
                            }}
                          >
                            <FaLightbulb style={{ marginRight: '4px' }} /> Estrategia
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dash-text-muted">No hay datos en este periodo</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
