/**
 * Componente de Auditoría (Logs del Sistema)
 * 
 * Interfaz de solo lectura que permite a los superadministradores rastrear
 * acciones críticas realizadas por todos los usuarios del sistema.
 * Registra quién, cuándo y qué acción (INSERT/UPDATE/DELETE) realizó.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaClock, FaUser, FaDatabase, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import '../assets/styles/auditoria.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLog, setDetailLog] = useState(null);

  useEffect(() => {
    cargarLogs();
  }, [page, search]);

  /**
   * Carga el registro de auditoría ordenado cronológicamente desde el servidor.
   */
  const cargarLogs = () => {
    apiFetch(`/api/auditoria?page=${page}&limit=8&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setLogs(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(console.error);
  };

  /**
   * Visualiza la carga útil en crudo (JSON) de los datos que fueron modificados.
   */
  const verDetalle = (log) => {
    setDetailLog(log);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Auditoría del Sistema</h2>
          <p className="page-sub">Registro de acciones y cambios realizados por los usuarios.</p>
        </div>
      </div>

      <div className="main-card">
        <div className="table-responsive">
        <DataGridPremium
          columns={[
            { key: 'fecha', label: 'Fecha y Hora', render: (log) => new Date(log.fecha).toLocaleString('es-PE') },
            { 
              key: 'usuario', 
              label: 'Usuario', 
              render: (log) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaUser style={{ color: 'var(--text-muted)' }} />
                  <span className="user-name-text">@{log.usuario || 'Sistema'}</span>
                </div>
              )
            },
            { 
              key: 'accion', 
              label: 'Acción', 
              render: (log) => (
                <span className={`history-badge ${
                  log.accion === 'INSERT' ? 'badge-INSERT' :
                  log.accion === 'UPDATE' ? 'badge-UPDATE' :
                  log.accion === 'DELETE' ? 'badge-DELETE' :
                  log.accion === 'LOGIN'  ? 'badge-LOGIN'  : 'badge-INSERT'
                }`}>
                  {log.accion}
                </span>
              )
            },
            { 
              key: 'tabla', 
              label: 'Tabla', 
              render: (log) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaDatabase style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-main)' }}>{log.tabla_afectada || '-'}</span>
                </div>
              )
            },
            { 
              key: 'descripcion', 
              label: 'Descripción / Detalle', 
              render: (log) => (
                <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{log.descripcion || 'Sin descripción'}</span>
              )
            },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (log) => (
                <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(log)} title="Ver Detalle"><FaEye /></button>
              )
            }
          ]}
          data={logs}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
        </div>
      </div>

      {/* Modal Detalle */}
      {showDetailModal && detailLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle de Auditoría</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha y Hora</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(detailLog.fecha).toLocaleString('es-PE')}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuario</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>@{detailLog.usuario || 'Sistema'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acción</label>
                <div>
                  <span className={`history-badge ${
                    detailLog.accion.includes('INSERT') ? 'badge-success' : 
                    detailLog.accion.includes('UPDATE') ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {detailLog.accion}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tabla</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailLog.tabla_afectada || '-'}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{detailLog.id}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detalles / Valores</label>
                <pre style={{ 
                  background: 'var(--bg-app)', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-main)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {detailLog.descripcion || 'Sin descripción adicional.'}
                </pre>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-new" style={{ background: 'var(--text-muted)' }} onClick={() => setShowDetailModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
