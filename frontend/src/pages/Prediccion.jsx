/**
 * Componente de Predicción con Inteligencia Artificial
 * 
 * Permite al administrador consultar el pronóstico de demanda de pan 
 * generado por el modelo Random Forest (Python/FastAPI) y visualizar 
 * los resultados en gráficas de barras interactivas.
 */
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  FaCalendarDay, FaLightbulb, FaClockRotateLeft,
  FaChevronLeft, FaChevronRight, FaChartSimple, FaBreadSlice
} from 'react-icons/fa6';
import { apiFetch } from '../services/http';
import Swal from 'sweetalert2';
import '../assets/styles/prediccion.css';

const CHART_COLORS = ['#b45309', '#d97706', '#f59e0b', '#8c4f2b', '#5e3019', '#e0a96d'];

export default function Prediccion() {
  // Estado para la fecha objetivo de la predicción y controles de UI (Loading)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  
  // Métricas extraídas y formateadas para la pantalla principal
  const [stats, setStats] = useState({ ventasHoy: 'S/ 0.00', productoTop: '-', estimacionTotal: '0 uds', fechaEstimacion: '-' });
  const [chartData, setChartData] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [metrics, setMetrics] = useState(null);

  // Historial Paginado (Backend)
  const [historial, setHistorial] = useState([]);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialTotalPages, setHistorialTotalPages] = useState(1);

  useEffect(() => {
    cargarHistorial();
  }, [historialPage]);

  useEffect(() => {
    cargarStats();
  }, []);

  const cargarStats = async () => {
    try {
      const res = await apiFetch('/api/ventas/stats');
      const data = await res.json();
      setStats(prev => ({
        ...prev,
        ventasHoy: `S/ ${Number(data.summary.ventasHoy).toFixed(2)}`,
        productoTop: data.topProductos[0]?.nombre || 'Ninguno'
      }));
    } catch (err) {
      console.error('Error cargando stats en prediccion:', err);
    }
  };

  const cargarHistorial = async () => {
    try {
      const res = await apiFetch(`/api/prediccion/historial?page=${historialPage}&limit=5`);
      const result = await res.json();

      const data = Array.isArray(result) ? result : (result.data || []);
      const totalP = result.meta?.last_page || 1;

      setHistorial(data);
      setHistorialTotalPages(totalP);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorial([]);
    }
  };

  /**
   * Ejecuta la consulta principal hacia la API de predicción (Machine Learning).
   * Genera el pronóstico y, automáticamente, programa una orden de producción.
   * 
   * @param {string|Event} fechaParam - La fecha para la cual se desea generar la predicción.
   */
  const procesarIA = async (fechaParam = null) => {
    // Si viene del evento onClick del botón, será un objeto Event. 
    // Si viene de nuestro código, será un string (la fecha).
    const targetFecha = (typeof fechaParam === 'string') ? fechaParam : fecha;
    
    // Actualizamos el input visual
    if (typeof fechaParam === 'string') {
      setFecha(targetFecha);
    }
    
    setLoading(true);
    try {
      const res = await apiFetch('/api/prediccion/generar', {
        method: 'POST',
        body: JSON.stringify({ fecha: targetFecha })
      });
      const data = await res.json();

      if (data.predicciones) {
        const formatted = data.predicciones.map((p, i) => ({
          name: p.producto,
          value: Math.round(p.cantidad_estimada),
          color: CHART_COLORS[i % CHART_COLORS.length]
        }));
        setChartData(formatted);
        setTablePage(1);

        const total = formatted.reduce((sum, p) => sum + p.value, 0);
        setStats(prev => ({ ...prev, estimacionTotal: `${total} uds`, fechaEstimacion: targetFecha }));

        // Sincronizar con Producción
        await apiFetch('/api/produccion/desde-prediccion', {
          method: 'POST',
          body: JSON.stringify({ predicciones: data.predicciones, fecha: targetFecha })
        });

        cargarHistorial();

        Swal.fire({
          title: 'Plan Cargado',
          text: `Se han cargado los datos para el día ${targetFecha}.`,
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error', 'Servicio de Predicción no disponible.', 'error');
    }
    setLoading(false);
  };

  const cargarDesdeHistorial = async (fechaParam) => {
    setFecha(fechaParam);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/prediccion/resumen/${fechaParam}`);
      const data = await res.json();

      if (data.porProducto && data.porProducto.length > 0) {
        const formatted = data.porProducto.map((p, i) => ({
          name: p.producto,
          value: Math.round(p.cantidad_estimada),
          color: CHART_COLORS[i % CHART_COLORS.length]
        }));
        setChartData(formatted);
        setTablePage(1);

        const total = formatted.reduce((sum, p) => sum + p.value, 0);
        setStats(prev => ({ ...prev, estimacionTotal: `${total} uds`, fechaEstimacion: fechaParam }));
        
        Swal.fire({
          title: 'Historial Cargado',
          text: `Se han cargado las predicciones guardadas para el día ${fechaParam}.`,
          icon: 'info',
          confirmButtonColor: 'var(--primary)',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Aviso', 'No se encontraron datos en el historial para esta fecha.', 'warning');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo cargar el historial.', 'error');
    }
    setLoading(false);
  };

  /**
   * Llama al microservicio de Python para iniciar un ciclo de re-entrenamiento
   * del modelo Random Forest con los datos frescos de la Base de Datos.
   * Retorna y muestra las métricas de error (MAE, RMSE, MAPE, R2).
   */
  const reentrenarModelo = async () => {
    setTraining(true);
    try {
      const res = await apiFetch('/api/prediccion/entrenar', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMetrics(data.metrics);
        Swal.fire({
          title: '¡Modelo Entrenado!',
          text: `Modelo actualizado con ${data.metrics.data_size} registros de ${data.metrics.data_source}.`,
          icon: 'success',
          confirmButtonColor: 'var(--primary)'
        });
      } else {
        Swal.fire('Aviso', data.message || 'No se pudo entrenar.', 'warning');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar con el servicio de entrenamiento.', 'error');
    }
    setTraining(false);
  };

  const itemsPerPage = 5;
  const totalTablePages = Math.ceil(chartData.length / itemsPerPage);
  const paginatedData = chartData.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);

  return (
    <div className="main-wrapper">
      <div className="prediccion-container">

        <div className="prediccion-header">
          <div>
            <h2 className="production-title">Predicción de Demanda</h2>
            <p className="production-sub">Análisis predictivo con Machine Learning y sincronización de producción</p>
          </div>
          <div className="prediccion-controls">
            <div className="date-picker-wrapper">
              <FaCalendarDay style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={fecha} className="calendar-input" onChange={(e) => setFecha(e.target.value)} />
            </div>
            <button className="btn-new" onClick={procesarIA} disabled={loading}>
              {loading ? 'PROCESANDO...' : 'PROCESAR'}
            </button>
          </div>
        </div>

        {/* Métricas del Modelo */}
        {metrics && (
          <div className="prediccion-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
            <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="kpi-title-ref">MAE (Error Absoluto)</div>
              <div className="kpi-value-ref" style={{ color: '#3b82f6' }}>{metrics.mae.toFixed(2)}</div>
            </div>
            <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="kpi-title-ref">RMSE (Error Cuadrático)</div>
              <div className="kpi-value-ref" style={{ color: '#10b981' }}>{metrics.rmse.toFixed(2)}</div>
            </div>
            <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="kpi-title-ref">MAPE (Error %)</div>
              <div className="kpi-value-ref" style={{ color: '#f59e0b' }}>{metrics.mape.toFixed(2)}%</div>
            </div>
            <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="kpi-title-ref">R² (Precisión)</div>
              <div className="kpi-value-ref" style={{ color: '#ef4444' }}>{metrics.r2.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="prediccion-kpi-grid">
          <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid var(--brand-500)' }}>
            <div className="kpi-title-ref"><FaChartSimple style={{ marginRight: '4px' }} /> VENTAS HOY</div>
            <div className="kpi-value-ref" style={{ color: 'var(--primary)' }}>{stats.ventasHoy}</div>
          </div>
          <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="kpi-title-ref"><FaBreadSlice style={{ marginRight: '4px' }} /> PRODUCTO ESTRELLA</div>
            <div className="kpi-value-ref" style={{ color: '#f59e0b' }}>{stats.productoTop}</div>
          </div>
          <div className="prediccion-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="kpi-title-ref"><FaCalendarDay style={{ marginRight: '4px' }} /> ESTIMACIÓN TOTAL</div>
            <div className="kpi-value-ref" style={{ color: '#10b981' }}>{stats.estimacionTotal}</div>
            {stats.fechaEstimacion !== '-' && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Para el {stats.fechaEstimacion}</div>
            )}
          </div>
        </div>

        <div className="prediccion-main-layout">
          <section className="main-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%', boxSizing: 'border-box' }}>
            <h3 className="card-title" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
              <FaChartSimple style={{ color: 'var(--primary)' }} /> Demanda Proyectada por Producto
            </h3>
            <div style={{ flex: 1, minHeight: '360px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData.length > 0 ? chartData : [{ name: 'Sin datos', value: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" stroke="var(--text-muted)" />
                  <YAxis fontSize={9} axisLine={false} tickLine={false} stroke="var(--text-muted)" />
                  <Tooltip cursor={{ fill: 'var(--bg-app)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <aside>
            <div className="card-recomendacion-ref">
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaLightbulb style={{ color: '#f59e0b' }} /> Recomendación
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '1.8rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '12px' }}>
                  <FaBreadSlice />
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {stats.estimacionTotal === '0 uds'
                    ? 'Procesa una fecha para ver la recomendación.'
                    : `Produce ${stats.estimacionTotal.split(' ')[0]} unidades para el día ${fecha.split('-').reverse().join('/')}.`}
                </p>
              </div>
            </div>

            <div className="prediccion-tables-grid">
              {/* Cantidades Proyectadas a Producir */}
              <div className="card-historial-ref">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaBreadSlice style={{ color: 'var(--primary)' }} /> Cantidades Proyectadas
                </h4>
                <div className="table-responsive" style={{ marginTop: '10px' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.75rem' }}>Producto</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', width: '100px', fontSize: '0.75rem' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.length > 0 ? (
                        <>
                          {paginatedData.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }}></span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{item.name}</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: 'var(--brand-600)', fontSize: '0.8rem' }}>
                                {item.value} uds
                              </td>
                            </tr>
                          ))}
                          {Array.from({ length: Math.max(0, 5 - paginatedData.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <>
                          <tr>
                            <td colSpan="2" style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '0.75rem', height: '53px', boxSizing: 'border-box' }}>
                              Procesa una fecha para ver cantidades
                            </td>
                          </tr>
                          {Array.from({ length: 4 }).map((_, index) => (
                            <tr key={`empty-noscript-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Controles de Paginación de la Tabla (Siempre renderizados para mantener altura idéntica) */}
                <div className="pagination-container-ai">
                  <button className="btn-page-ai" onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}><FaChevronLeft /></button>
                  <span className="page-info-ai">{tablePage} / {totalTablePages || 1}</span>
                  <button className="btn-page-ai" onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))} disabled={tablePage === totalTablePages || totalTablePages <= 1}><FaChevronRight /></button>
                </div>
              </div>

              {/* Historial (DB) */}
              <div className="card-historial-ref">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaClockRotateLeft style={{ color: 'var(--text-muted)' }} /> Historial (DB)
                </h4>
                <div className="table-responsive" style={{ marginTop: '10px' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.75rem' }}>Fecha</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', width: '100px', fontSize: '0.75rem' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(historial) && historial.length > 0 ? (
                        <>
                          {historial.map((h, i) => {
                            // Extraemos solo la parte YYYY-MM-DD para pasarla a procesarIA
                            const dateString = new Date(h.fecha).toISOString().split('T')[0];
                            return (
                            <tr 
                              key={i} 
                              style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                              onClick={() => cargarDesdeHistorial(dateString)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                                {new Date(h.fecha).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem' }}>
                                {Math.round(Number(h.total) || 0)} uds
                              </td>
                            </tr>
                            );
                          })}
                          {Array.from({ length: Math.max(0, 5 - historial.length) }).map((_, index) => (
                            <tr key={`empty-h-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <>
                          <tr>
                            <td colSpan="2" style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '0.75rem', height: '53px', boxSizing: 'border-box' }}>
                              No hay registros históricos.
                            </td>
                          </tr>
                          {Array.from({ length: 4 }).map((_, index) => (
                            <tr key={`empty-h-noscript-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                              <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Controles de Paginación del Historial (Siempre renderizados para mantener altura idéntica) */}
                <div className="pagination-container-ai">
                  <button className="btn-page-ai" onClick={() => setHistorialPage(p => Math.max(1, p - 1))} disabled={historialPage === 1}><FaChevronLeft /></button>
                  <span className="page-info-ai">{historialPage} / {historialTotalPages || 1}</span>
                  <button className="btn-page-ai" onClick={() => setHistorialPage(p => Math.min(historialTotalPages, p + 1))} disabled={historialPage === historialTotalPages || historialTotalPages <= 1}><FaChevronRight /></button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
