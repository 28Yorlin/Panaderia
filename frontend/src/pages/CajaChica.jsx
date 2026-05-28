/**
 * Componente de Caja Chica
 * 
 * Administra el flujo de efectivo disponible en tienda para gastos menores
 * urgentes o ingresos extraordinarios. Afecta el cálculo de liquidez diaria.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaTrash, FaMoneyBillTransfer, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/cajachica.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function CajaChica() {
  const [movimientos, setMovimientos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMovimiento, setDetailMovimiento] = useState(null);
  const [formData, setFormData] = useState({ descripcion: '', monto: '', tipo_movimiento: 'EGRESO', fecha: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    cargarMovimientos();
  }, [page, search]);

  /**
   * Recupera el listado de movimientos de caja chica paginados.
   */
  const cargarMovimientos = () => {
    apiFetch(`/api/cajachica?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setMovimientos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setMovimientos([]);
      });
  };

  /**
   * Registra un nuevo Ingreso o Egreso de efectivo.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/cajachica', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        Swal.fire('Guardado', 'Movimiento registrado correctamente.', 'success');
        setShowModal(false);
        setFormData({ descripcion: '', monto: '', tipo_movimiento: 'EGRESO', fecha: new Date().toISOString().split('T')[0] });
        cargarMovimientos();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo registrar.', 'error');
      }
    } catch (err) { 
      console.error(err); 
      Swal.fire('Error', 'No se pudo registrar el movimiento.', 'error');
    }
  };

  /**
   * Anula un movimiento de caja chica previamente registrado.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El registro de movimiento será eliminado.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/cajachica/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Movimiento eliminado.', 'success');
          cargarMovimientos();
        }
      } catch (err) { console.error(err); }
    }
  };

  const verDetalle = (movimiento) => {
    setDetailMovimiento(movimiento);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Caja Chica</h2>
          <p className="page-sub">Control de ingresos y egresos menores de efectivo.</p>
        </div>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <FaPlus /> REGISTRAR MOVIMIENTO
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { key: 'fecha', label: 'Fecha', render: (m) => new Date(m.fecha).toLocaleDateString() },
            { key: 'descripcion', label: 'Descripción', render: (m) => m.descripcion },
            { 
              key: 'tipo_movimiento', 
              label: 'Tipo', 
              render: (m) => (
                <span className={m.tipo_movimiento === 'INGRESO' ? 'caja-badge-ingreso' : 'caja-badge-egreso'}>
                  {m.tipo_movimiento}
                </span>
              )
            },
            { 
              key: 'monto', 
              label: 'Monto', 
              render: (m) => (
                <span className={m.tipo_movimiento === 'INGRESO' ? 'caja-monto-ingreso' : 'caja-monto-egreso'}>
                  {m.tipo_movimiento === 'INGRESO' ? '+' : '-'} S/ {Number(m.monto).toFixed(2)}
                </span>
              )
            },
            { key: 'usuario', label: 'Usuario', render: (m) => m.usuario || 'Sistema' },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (m) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(m)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-delete" onClick={() => handleDelete(m.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={movimientos}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Nuevo Movimiento */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Nuevo Movimiento</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input type="date" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Descripción</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej. Compra de bolsas" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto (S/)</label>
                <input type="number" step="0.01" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="0.00" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo de Movimiento</label>
                <select className="login-input" style={{ paddingLeft: '10px', height: '40px' }} value={formData.tipo_movimiento} onChange={(e) => setFormData({...formData, tipo_movimiento: e.target.value})} required>
                  <option value="EGRESO">Egreso (-)</option>
                  <option value="INGRESO">Ingreso (+)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>REGISTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && detailMovimiento && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle del Movimiento</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(detailMovimiento.fecha).toLocaleDateString()}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Descripción</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailMovimiento.descripcion}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo</label>
                <div style={{ fontWeight: 700 }}>
                  <span className={detailMovimiento.tipo_movimiento === 'INGRESO' ? 'caja-badge-ingreso' : 'caja-badge-egreso'}>
                    {detailMovimiento.tipo_movimiento}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto</label>
                <div className={detailMovimiento.tipo_movimiento === 'INGRESO' ? 'caja-monto-ingreso' : 'caja-monto-egreso'}>
                  {detailMovimiento.tipo_movimiento === 'INGRESO' ? '+' : '-'} S/ {Number(detailMovimiento.monto).toFixed(2)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuario</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailMovimiento.usuario || 'Sistema'}</div>
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
