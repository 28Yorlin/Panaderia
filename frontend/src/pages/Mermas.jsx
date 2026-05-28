/**
 * Componente Control de Mermas (Desperdicios)
 * 
 * Permite asentar pérdidas de inventario por diversos motivos (Robo, Caducidad, Daño).
 * Diferencia si la merma aplica a "Producto Terminado" o a "Materia Prima (Insumos)".
 * Al registrar la pérdida, descuenta automáticamente la cantidad del stock real.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaTrashCan, FaTriangleExclamation, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/mermas.css';

export default function Mermas() {
  const [mermas, setMermas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMerma, setDetailMerma] = useState(null);
  const [formData, setFormData] = useState({ 
    tipo_merma: 'PRODUCTO', producto_id: '', insumo_id: '', 
    cantidad: '', motivo: 'Dañado', fecha: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    cargarMermas();
  }, [page]);

  useEffect(() => {
    cargarProductos();
    cargarInsumos();
  }, []);

  /**
   * Carga el historial de mermas registradas, paginado desde el Backend.
   */
  const cargarMermas = () => {
    apiFetch(`/api/mermas?page=${page}&limit=10`)
      .then(r => r.json())
      .then(data => {
        setMermas(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
      })
      .catch(err => {
        console.error(err);
        setMermas([]);
      });
  };

  const cargarProductos = () => {
    apiFetch('/api/productos?all=true').then(r => r.json()).then(setProductos).catch(console.error);
  };

  const cargarInsumos = () => {
    apiFetch('/api/insumos?all=true').then(r => r.json()).then(setInsumos).catch(console.error);
  };

  /**
   * Envía la orden de merma al servidor.
   * Ejecuta validaciones front-end para asegurar que el ID de producto/insumo no esté vacío.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que se haya seleccionado el item correcto según el tipo
    if (formData.tipo_merma === 'PRODUCTO' && !formData.producto_id) {
      Swal.fire('Error', 'Debe seleccionar un producto.', 'error');
      return;
    }
    if (formData.tipo_merma === 'INSUMO' && !formData.insumo_id) {
      Swal.fire('Error', 'Debe seleccionar un insumo.', 'error');
      return;
    }

    try {
      const res = await apiFetch('/api/mermas', { 
        method: 'POST', 
        body: JSON.stringify(formData) 
      });
      if (res.ok) {
        Swal.fire('Registrado', 'La merma ha sido descontada del inventario.', 'success');
        setShowModal(false);
        setFormData({ 
          tipo_merma: 'PRODUCTO', producto_id: '', insumo_id: '', 
          cantidad: '', motivo: 'Dañado', fecha: new Date().toISOString().split('T')[0] 
        });
        cargarMermas();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo registrar.', 'error');
      }
    } catch (err) { 
      console.error(err); 
      Swal.fire('Error', 'No se pudo registrar la merma.', 'error');
    }
  };

  const verDetalle = (merma) => {
    setDetailMerma(merma);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Control de Desperdicios (Mermas)</h2>
          <p className="page-sub">Registro de pérdidas para ajuste automático de inventario.</p>
        </div>
        <button className="btn-new merma-header-btn" onClick={() => setShowModal(true)}>
          <FaPlus /> REGISTRAR MERMA
        </button>
      </div>

      <div className="main-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Item</th>
                <th>Motivo</th>
                <th style={{ textAlign: 'center' }}>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mermas.map(m => (
                <tr key={m.id}>
                  <td className="merma-table-date">{new Date(m.fecha).toLocaleDateString()}</td>
                  <td>
                    <span className={`history-badge ${m.tipo_merma === 'PRODUCTO' ? 'badge-warning' : 'badge-danger'}`}>
                      {m.tipo_merma}
                    </span>
                  </td>
                  <td>
                    <div className="merma-product-info">
                      <span className="merma-product-name">{m.item_nombre || 'Desconocido'}</span>
                      <span className="merma-product-id">ID: #{m.producto_id || m.insumo_id}</span>
                    </div>
                  </td>
                  <td><span className="merma-reason-tag">{m.motivo}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="merma-loss-value">-{m.cantidad}</span>
                  </td>
                  <td>
                    <div className="client-actions-div">
                      <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(m)} title="Ver Detalle"><FaEye /></button>
                      <button className="btn-delete" title="Eliminar"><FaTrashCan /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {mermas.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No hay mermas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pagination-container">
          <div className="pagination-info">Página <strong>{page}</strong> de {totalPages}</div>
          <div className="pagination-buttons">
            <button className="btn-page" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}><FaChevronLeft /></button>
            <button className="btn-page active">{page}</button>
            <button className="btn-page" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}><FaChevronRight /></button>
          </div>
        </div>
      </div>

      {/* Modal Registrar Merma */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Registrar Merma</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="merma-loss-card">
                <FaTriangleExclamation style={{ fontSize: '1.5rem', color: '#e11d4e' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e11d4e' }}>Esta acción reducirá el stock disponible en inventario.</span>
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo de Merma</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.tipo_merma}
                  onChange={(e) => setFormData({...formData, tipo_merma: e.target.value, producto_id: '', insumo_id: ''})}
                >
                  <option value="PRODUCTO">Producto Terminado</option>
                  <option value="INSUMO">Materia Prima / Insumo</option>
                </select>
              </div>

              {formData.tipo_merma === 'PRODUCTO' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Producto</label>
                  <select 
                    className="login-input" 
                    style={{ paddingLeft: '10px', height: '40px' }}
                    value={formData.producto_id}
                    onChange={(e) => setFormData({...formData, producto_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar Producto...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Insumo</label>
                  <select 
                    className="login-input" 
                    style={{ paddingLeft: '10px', height: '40px' }}
                    value={formData.insumo_id}
                    onChange={(e) => setFormData({...formData, insumo_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar Insumo...</option>
                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cantidad</label>
                <input type="number" step="0.01" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="0.00" value={formData.cantidad} onChange={(e) => setFormData({...formData, cantidad: e.target.value})} required />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Motivo</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.motivo}
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                >
                  <option value="Dañado">Dañado</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Defectuoso">Defectuoso</option>
                  <option value="Robo/Pérdida">Robo/Pérdida</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input type="date" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px', background: '#e11d4e' }}>REGISTRAR PÉRDIDA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && detailMerma && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle de la Merma</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailMerma.tipo_merma}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Item</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailMerma.item_nombre}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cantidad</label>
                <div style={{ fontWeight: 700, color: '#e11d4e' }}>-{detailMerma.cantidad}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Motivo</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailMerma.motivo}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(detailMerma.fecha).toLocaleDateString()}</div>
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
