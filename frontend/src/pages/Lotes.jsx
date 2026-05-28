/**
 * Componente Lotes de Producción
 * 
 * Visualiza el registro histórico de todas las órdenes de horneado generadas.
 * Útil para trazabilidad en caso de lotes defectuosos y para análisis de productividad.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaBox, FaCircleCheck, FaClock, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/lotes.css';

export default function Lotes() {
  const [planes, setPlanes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLote, setDetailLote] = useState(null);

  useEffect(() => {
    cargarPlanes();
  }, [page]);

  /**
   * Recupera el histórico de producción, sin filtro de fecha específica.
   */
  const cargarPlanes = async () => {
    setLoading(true);
    try {
      // Sin filtro de fecha para ver todos los lotes
      const res = await apiFetch(`/api/produccion?page=${page}&limit=10`);
      const result = await res.json();
      const data = Array.isArray(result) ? result : (result.data || []);
      const totalP = result.meta?.last_page || 1;
      setPlanes(data);
      setTotalPages(totalP);
    } catch (err) { 
      console.error(err);
      setPlanes([]);
    }
    setLoading(false);
  };

  const verDetalle = (lote) => {
    setDetailLote(lote);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Lotes de Producción</h2>
          <p className="page-sub">Historial completo y seguimiento de todos los lotes producidos.</p>
        </div>
      </div>

      <div className="main-card">
        {loading ? (
          <div className="loading-box">Cargando lotes...</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Lote</th>
                    <th>Producto</th>
                    <th>Fecha</th>
                    <th>Cant. Programada</th>
                    <th>Cant. Producida</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planes.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800 }}>#LOT-{p.id}</td>
                      <td>{p.producto_nombre}</td>
                      <td>{new Date(p.fecha).toLocaleDateString()}</td>
                      <td>{p.cantidad_programada}</td>
                      <td>{p.cantidad_producida || '-'}</td>
                      <td>
                        <span className={`badge ${p.estado === 'completado' ? 'badge-success' : 'badge-warning'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td>
                        <button className="btn-action btn-detail" onClick={() => verDetalle(p)} title="Ver Detalle">
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-box">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <FaChevronLeft />
              </button>
              <span className="pagination-text">Página {page} de {totalPages}</span>
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <FaChevronRight />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Detalle */}
      {showDetailModal && detailLote && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8c4f2b 0%, #b45309 100%)', color: 'white', borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <h3 style={{ margin: 0, color: 'white', fontWeight: 800 }}>📦 Detalle del Lote #LOT-{detailLote.id}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)} style={{ color: 'white', opacity: 0.8 }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRODUCTO</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '5px' }}>{detailLote.producto_nombre}</div>
                </div>
                <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FECHA</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '5px' }}>{new Date(detailLote.fecha).toLocaleDateString()}</div>
                </div>
                <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CANT. PROGRAMADA</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '5px' }}>{detailLote.cantidad_programada}</div>
                </div>
                <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CANT. PRODUCIDA</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '5px' }}>{detailLote.cantidad_producida || 'N/A'}</div>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTADO DEL LOTE</div>
                <span className={`badge ${detailLote.estado === 'completado' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.9rem', padding: '8px 16px', borderRadius: '8px' }}>
                  {detailLote.estado.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
