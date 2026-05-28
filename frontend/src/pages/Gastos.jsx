/**
 * Componente Control de Gastos Operativos
 * 
 * Interfaz para declarar salidas de caja que no corresponden a Compras formales de insumos
 * (por ejemplo: pago de luz, agua, limpieza, fletes).
 * Afecta indirectamente los reportes financieros.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaTrash, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/gastos.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailGasto, setDetailGasto] = useState(null);
  const [formData, setFormData] = useState({ descripcion: '', monto: '', fecha_gasto: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    cargarGastos();
  }, [page, search]);

  /**
   * Carga el registro de gastos con paginación desde el servidor.
   */
  const cargarGastos = () => {
    apiFetch(`/api/gastos?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setGastos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setGastos([]);
      });
  };

  /**
   * Inserta un nuevo gasto en la base de datos a través de la API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/gastos', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        Swal.fire('Guardado', 'Gasto registrado correctamente.', 'success');
        setShowModal(false);
        setFormData({ descripcion: '', monto: '', fecha_gasto: new Date().toISOString().split('T')[0] });
        cargarGastos();
      }
    } catch (err) { console.error(err); }
  };

  /**
   * Elimina un registro de gasto. Útil para correcciones de digitación.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El registro de gasto será eliminado.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/gastos/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Gasto eliminado.', 'success');
          cargarGastos();
        }
      } catch (err) { console.error(err); }
    }
  };

  const verDetalle = (gasto) => {
    setDetailGasto(gasto);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Control de Gastos</h2>
          <p className="page-sub">Registro de egresos operativos y administrativos.</p>
        </div>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <FaPlus /> REGISTRAR GASTO
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { key: 'fecha_gasto', label: 'Fecha', render: (g) => new Date(g.fecha_gasto).toLocaleDateString() },
            { key: 'descripcion', label: 'Descripción', render: (g) => g.descripcion },
            { key: 'monto', label: 'Monto', render: (g) => `- S/ ${Number(g.monto).toFixed(2)}` },
            { key: 'usuario', label: 'Usuario', render: (g) => g.usuario || 'Sistema' },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (g) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(g)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-delete" onClick={() => handleDelete(g.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={gastos}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Nuevo Gasto */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-gastos">
            <div className="modal-header">
              <h3 className="modal-title-gastos">Nuevo Gasto</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form-gastos">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input type="date" className="login-input input-gastos" value={formData.fecha_gasto} onChange={(e) => setFormData({...formData, fecha_gasto: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Descripción</label>
                <input type="text" className="login-input input-gastos" placeholder="Descripción del gasto" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto (S/)</label>
                <input type="number" step="0.01" className="login-input input-gastos" placeholder="0.00" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} required />
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
      {showDetailModal && detailGasto && (
        <div className="modal-overlay">
          <div className="modal-content modal-gastos">
            <div className="modal-header">
              <h3 className="modal-title-gastos">Detalle del Gasto</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(detailGasto.fecha_gasto).toLocaleDateString()}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Descripción</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailGasto.descripcion}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto</label>
                <div className="gasto-monto" style={{ fontSize: '1.2rem' }}>- S/ {Number(detailGasto.monto).toFixed(2)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuario</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailGasto.usuario || 'Sistema'}</div>
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
