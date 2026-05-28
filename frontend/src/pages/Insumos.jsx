/**
 * Componente de Gestión de Insumos
 * 
 * Permite a los administradores registrar, actualizar y dar de baja
 * la materia prima utilizada en las recetas de producción.
 * Incorpora indicadores visuales de criticidad de stock (Mínimo vs Actual).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaTriangleExclamation, FaWheatAwn, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/insumos.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Insumos() {
  const [insumos, setInsumos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailInsumo, setDetailInsumo] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', stock_actual: '', stock_minimo: '', 
    unidad_medida: 'KG', costo_unitario: '' 
  });

  useEffect(() => {
    cargarInsumos();
  }, [page, search]);

  /**
   * Obtiene la lista de insumos de la BD, gestionando la paginación y búsqueda
   * de forma asíncrona mediante un componente de cuadrícula avanzado.
   */
  const cargarInsumos = () => {
    apiFetch(`/api/insumos?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setInsumos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setInsumos([]);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/insumos/${editing.id}` : '/api/insumos';
    
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Insumo guardado correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ nombre: '', stock_actual: '', stock_minimo: '', unidad_medida: 'KG', costo_unitario: '' });
        cargarInsumos();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el insumo.', 'error');
    }
  };

  /**
   * Ejecuta una "baja lógica" sobre un insumo (para no romper el historial).
   * Despliega una alerta de confirmación con SweetAlert.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El insumo será marcado como inactivo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b45309',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/insumos/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Insumo eliminado.', 'success');
          cargarInsumos();
        }
      } catch (err) { console.error(err); }
    }
  };

  const verDetalle = (insumo) => {
    setDetailInsumo(insumo);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Suministros y Materia Prima</h2>
          <p className="page-sub">Control de insumos para la producción diaria.</p>
        </div>
        <button className="btn-new" onClick={() => { setEditing(null); setFormData({ nombre: '', stock_actual: '', stock_minimo: '', unidad_medida: 'KG', costo_unitario: '' }); setShowModal(true); }}>
          <FaPlus /> NUEVO INSUMO
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { 
              key: 'nombre', 
              label: 'Insumo', 
              render: (i) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="insumo-icon-box"><FaWheatAwn /></div>
                  <span className="insumo-name-text">{i.nombre}</span>
                </div>
              )
            },
            { 
              key: 'stock_actual', 
              label: 'Stock', 
              render: (i) => {
                const isCritical = Number(i.stock_actual) <= Number(i.stock_minimo);
                return (
                  <span className={`insumo-stock-badge ${isCritical ? 'stock-critical' : 'stock-ok'}`}>
                    {i.stock_actual} <span className="insumo-measure">{i.unidad_medida}</span>
                  </span>
                );
              }
            },
            { key: 'stock_minimo', label: 'Mínimo', render: (i) => `${i.stock_minimo} ${i.unidad_medida}` },
            { key: 'costo_unitario', label: 'Costo Unit.', render: (i) => `S/ ${Number(i.costo_unitario || 0).toFixed(2)}` },
            { 
              key: 'estado', 
              label: 'Estado', 
              render: (i) => {
                const isCritical = Number(i.stock_actual) <= Number(i.stock_minimo);
                return isCritical ? (
                  <span className="insumo-label-critical">
                    <FaTriangleExclamation /> CRÍTICO
                  </span>
                ) : (
                  <span className="insumo-label-ok">ESTABLE</span>
                );
              }
            },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (i) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(i)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-edit" onClick={() => { setEditing(i); setFormData(i); setShowModal(true); }} title="Editar"><FaPencil /></button>
                  <button className="btn-delete" onClick={() => handleDelete(i.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={insumos}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Detalle */}
      {showDetailModal && detailInsumo && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-insumos">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle del Insumo</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailInsumo.nombre}</div>
              </div>
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Actual</label>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailInsumo.stock_actual} {detailInsumo.unidad_medida}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Mínimo</label>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailInsumo.stock_minimo} {detailInsumo.unidad_medida}</div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Costo Unitario</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>S/ {Number(detailInsumo.costo_unitario || 0).toFixed(2)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado</label>
                <div style={{ fontWeight: 700 }}>
                  {Number(detailInsumo.stock_actual) <= Number(detailInsumo.stock_minimo) ? 
                    <span style={{ color: '#ef4444' }}>Crítico</span> : 
                    <span style={{ color: '#10b981' }}>Estable</span>
                  }
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-new" style={{ background: 'var(--text-muted)' }} onClick={() => setShowDetailModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-insumos">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</h3>
              <button className="btn-close" onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', stock_actual: '', stock_minimo: '', unidad_medida: 'KG', costo_unitario: '' }); }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre del Insumo</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej. Harina Especial" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
              </div>
              
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Inicial</label>
                  <input type="number" step="0.01" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="0.00" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Mínimo</label>
                  <input type="number" step="0.01" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="1.00" value={formData.stock_minimo} onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})} required />
                </div>
              </div>

              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unidad de Medida</label>
                  <select className="login-input" style={{ paddingLeft: '10px', height: '40px' }} value={formData.unidad_medida} onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})}>
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="LITROS">Litros (L)</option>
                    <option value="UNIDADES">Unidades (UND)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Costo Unitario (S/)</label>
                  <input type="number" step="0.01" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="0.00" value={formData.costo_unitario} onChange={(e) => setFormData({...formData, costo_unitario: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', stock_actual: '', stock_minimo: '', unidad_medida: 'KG', costo_unitario: '' }); }}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>{editing ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
