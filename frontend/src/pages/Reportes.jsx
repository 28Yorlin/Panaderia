/**
 * Componente de Reportes e Inteligencia Comercial
 * 
 * Dashboard analítico que presenta KPIs (Ingresos, Gastos, Utilidad)
 * y gráficos estadísticos. Soporta filtros por rango de fechas
 * y exportación de datos a PDF o Excel.
 */
import React, { useEffect, useState } from 'react';
import { FaFilePdf, FaFileExcel, FaChartLine, FaRankingStar, FaMoneyBillTrendUp, FaBagShopping } from 'react-icons/fa6';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { apiFetch } from '../services/http';
import { exportToPDF, exportToExcel } from '../services/exportService';
import Swal from 'sweetalert2';
import '../assets/styles/reportes.css';

const COLORS = ['#b45309', '#d97706', '#f59e0b', '#8c4f2b', '#5e3019'];

export default function Reportes() {
  const [stats, setStats] = useState({ summary: { totalVentas: 0, ventasHoy: 0 }, topProductos: [], ventasMensuales: [] });
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [activeTab, setActiveTab] = useState('graficos'); // 'graficos' o 'tabla'

  useEffect(() => {
    cargarStats();
  }, []);

  /**
   * Consulta al endpoint analítico para obtener la sumatoria de ventas,
   * el top de productos y los datos agrupados para gráficos.
   */
  const cargarStats = async (d = desde, h = hasta) => {
    setLoading(true);
    try {
      let url = '/api/ventas/stats';
      if (d && h) {
        url += `?desde=${d}&hasta=${h}`;
      }
      const res = await apiFetch(url);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  /**
   * Auto-configura el rango de fechas basado en selecciones rápidas.
   */
  const setPeriodo = (tipo) => {
    const hoy = new Date().toISOString().slice(0, 10);
    let hace = new Date();
    let desdeCalculado = hoy;
    
    if (tipo === 'diario') {
      desdeCalculado = hoy;
    } else if (tipo === 'semanal') {
      hace.setDate(hace.getDate() - 7);
      desdeCalculado = hace.toISOString().slice(0, 10);
    } else if (tipo === 'mensual') {
      hace.setDate(hace.getDate() - 30);
      desdeCalculado = hace.toISOString().slice(0, 10);
    } else if (tipo === 'anual') {
      hace.setFullYear(hace.getFullYear() - 1);
      desdeCalculado = hace.toISOString().slice(0, 10);
    }
    
    setDesde(desdeCalculado);
    setHasta(hoy);
    cargarStats(desdeCalculado, hoy);
  };

  /**
   * Exporta la tabla del "Top Productos" a formato PDF.
   */
  const handleExportPDF = () => {
    if (!stats.topProductos || stats.topProductos.length === 0) {
      Swal.fire('Aviso', 'No hay datos disponibles para exportar en este rango de fechas.', 'warning');
      return;
    }
    const headers = ['Producto', 'Cantidad Vendida'];
    const data = stats.topProductos.map(p => [p.nombre, p.total_vendido]);
    exportToPDF('Reporte de Productos más Vendidos', headers, data, 'top_ventas_rincon.pdf');
  };

  /**
   * Exporta la tabla del "Top Productos" a formato Excel.
   */
  const handleExportExcel = () => {
    if (!stats.topProductos || stats.topProductos.length === 0) {
      Swal.fire('Aviso', 'No hay datos disponibles para exportar en este rango de fechas.', 'warning');
      return;
    }
    const data = stats.topProductos.map(p => ({
      'Producto': p.nombre,
      'Cantidad Vendida': p.total_vendido
    }));
    exportToExcel(data, 'top_ventas_rincon.xlsx');
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box" style={{ flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 className="page-title">Reportes e Inteligencia</h2>
          <p className="page-sub">Análisis profundo del rendimiento comercial y operativo.</p>
        </div>
        
        {/* Botones de Periodo Rápido */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>REPORTES:</span>
          <button className="btn-edit" onClick={() => setPeriodo('diario')} style={{ padding: '5px 10px', fontSize: '0.85rem' }}>Diario</button>
          <button className="btn-edit" onClick={() => setPeriodo('semanal')} style={{ padding: '5px 10px', fontSize: '0.85rem' }}>Semanal</button>
          <button className="btn-edit" onClick={() => setPeriodo('mensual')} style={{ padding: '5px 10px', fontSize: '0.85rem' }}>Mensual</button>
          <button className="btn-edit" onClick={() => setPeriodo('anual')} style={{ padding: '5px 10px', fontSize: '0.85rem' }}>Anual</button>
        </div>

        {/* Filtro de Fechas */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-card)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>DESDE</label>
            <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ padding: '5px', fontSize: '0.85rem', height: 'auto' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>HASTA</label>
            <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ padding: '5px', fontSize: '0.85rem', height: 'auto' }} />
          </div>
          <button className="btn-new" onClick={() => cargarStats()} style={{ height: '32px', alignSelf: 'flex-end', padding: '0 15px' }}>
            Filtrar
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-edit" onClick={handleExportExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <FaFileExcel /> EXCEL
          </button>
          <button className="btn-new" onClick={handleExportPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <FaFilePdf /> PDF
          </button>
        </div>
      </div>

      {/* Pestañas para ahorrar espacio vertical */}
      <div className="history-tabs-container" style={{ marginBottom: '20px' }}>
        <button className={`history-tab-btn ${activeTab === 'graficos' ? 'active' : ''}`} onClick={() => setActiveTab('graficos')}>
          Gráficos
        </button>
        <button className={`history-tab-btn ${activeTab === 'tabla' ? 'active' : ''}`} onClick={() => setActiveTab('tabla')}>
          Resumen Ejecutivo
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="report-kpi-card report-kpi-orange">
          <div className="report-kpi-label"><FaMoneyBillTrendUp /> INGRESOS TOTALES</div>
          <div className="report-kpi-value">S/ {Number(stats.summary.totalVentas).toFixed(2)}</div>
        </div>
        <div className="report-kpi-card report-kpi-dark">
          <div className="report-kpi-label"><FaBagShopping /> VENTAS DE HOY</div>
          <div className="report-kpi-value report-text-orange">S/ {Number(stats.summary.ventasHoy).toFixed(2)}</div>
        </div>
        <div className="report-kpi-card report-kpi-gray">
          <div className="report-kpi-label"><FaBagShopping /> GASTOS EN COMPRAS</div>
          <div className="report-kpi-value">S/ {Number(stats.summary.totalCompras || 0).toFixed(2)}</div>
        </div>
        <div className="report-kpi-card report-kpi-orange">
          <div className="report-kpi-label"><FaMoneyBillTrendUp /> UTILIDAD ESTIMADA</div>
          <div className="report-kpi-value" style={{ color: (stats.summary.totalVentas - (stats.summary.totalCompras || 0)) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            S/ {Number(stats.summary.totalVentas - (stats.summary.totalCompras || 0)).toFixed(2)}
          </div>
        </div>
        <div className="report-kpi-card report-kpi-gray">
          <div className="report-kpi-label"><FaRankingStar /> PRODUCTOS TOP</div>
          <div className="report-kpi-value">{stats.topProductos.length} activos</div>
        </div>
      </div>

      {activeTab === 'graficos' && (
        <div className="reports-grid">
          <div className="chart-box-premium">
            <h3 className="card-title report-title-margin"><FaChartLine /> Histórico de Ingresos (30d)</h3>
            <div className="report-chart-container">
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <LineChart data={stats.ventasMensuales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--text-muted)' }} axisLine={false} />
                  <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
                    itemStyle={{ fontWeight: 800, color: '#b45309' }}
                    labelStyle={{ color: 'var(--text-main)' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#b45309" strokeWidth={4} dot={{ r: 5, fill: '#b45309', strokeWidth: 2, stroke: 'white' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-box-premium">
            <h3 className="card-title report-title-margin"><FaRankingStar /> Top 5 más Vendidos</h3>
            <div className="report-chart-container">
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={stats.topProductos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" fontSize={12} tick={{ fill: 'var(--text-main)', fontWeight: 700 }} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                    labelStyle={{ color: 'var(--text-main)' }}
                    itemStyle={{ color: '#b45309' }}
                  />
                  <Bar dataKey="total_vendido" radius={[0, 10, 10, 0]} barSize={25}>
                    {stats.topProductos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tabla' && (
        <div className="main-card">
          <h3 className="card-title">Resumen Ejecutivo</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ranking</th>
                  <th>Producto Estrella</th>
                  <th style={{ textAlign: 'center' }}>Unidades</th>
                  <th>Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProductos.map((p, index) => (
                  <tr key={index}>
                    <td className="report-text-muted-bold">#{index + 1}</td>
                    <td className="report-text-bold">{p.nombre}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--text-main)' }}>{p.total_vendido} uds</td>
                    <td>
                      <span className="report-badge-high">ALTA DEMANDA</span>
                    </td>
                  </tr>
                ))}
                {stats.topProductos.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No hay datos disponibles</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
