/**
 * Componente del Plan de Producción
 * 
 * Gestiona la programación y seguimiento diario de la producción de pan (horneado).
 * Interactúa con el inventario: al finalizar una tarea de producción ("Horneado Completo"),
 * incrementa el stock de productos listos y registra el movimiento automáticamente.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaFireBurner, FaCircleCheck, FaCalendarDay, FaClock, FaCheckDouble, FaChevronLeft, FaChevronRight, FaPlus, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/produccion.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Produccion() {
  const [planes, setPlanes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLote, setDetailLote] = useState(null);
  const [formData, setFormData] = useState({ producto_id: '', fecha: fecha, cantidad_programada: '' });

  useEffect(() => {
    cargarPlanes();
  }, [fecha, page]);

  useEffect(() => {
    // Cargar productos para el formulario
    apiFetch('/api/productos?all=true')
      .then(r => r.json())
      .then(setProductos)
      .catch(console.error);
  }, []);

  /**
   * Consulta al Backend las tareas de producción programadas para una fecha específica.
   */
  const cargarPlanes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/produccion?fecha=${fecha}&page=${page}&limit=8`);
      const result = await res.json();
      const data = Array.isArray(result) ? result : (result.data || []);
      const totalP = result.meta?.last_page || 1;
      setPlanes(data);
      setTotalPages(totalP);
      setTotalRecords(result.meta?.total || 0);
    } catch (err) { 
      console.error(err);
      setPlanes([]);
    }
    setLoading(false);
  };

  /**
   * Marca una orden de producción como COMPLETADA.
   * Dispara un proceso en el servidor que actualizará la cantidad física en `productos`.
   */
  const finalizarTarea = async (id) => {
    const result = await Swal.fire({
      title: '¿Confirmar producción?',
      text: "Se actualizará el stock en el inventario.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, finalizar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/produccion/${id}/finalizar`, { method: 'POST' });
        if (res.ok) {
          Swal.fire({
            title: '¡Horneado Completo!',
            text: 'El stock ha sido actualizado automáticamente.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
          cargarPlanes();
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/produccion', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Plan de producción creado.', 'success');
        setShowModal(false);
        setFormData({ producto_id: '', fecha: fecha, cantidad_programada: '' });
        cargarPlanes();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo crear.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo crear el plan.', 'error');
    }
  };

  const verDetalle = (lote) => {
    setDetailLote(lote);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="production-workflow">
        
        <div className="production-calendar-bar">
          <div>
            <h2 className="production-title">Plan de Producción</h2>
            <p className="production-sub">Gestión de horneado y control de lotes.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn-new" onClick={() => setShowModal(true)}>
              <FaPlus /> NUEVA PRODUCCIÓN
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaCalendarDay style={{ color: 'var(--primary)' }} />
              <input 
                type="date" 
                value={fecha} 
                className="calendar-input"
                onChange={(e) => { setFecha(e.target.value); setFormData({...formData, fecha: e.target.value}); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Consultando plan de horneado...</div>
        ) : (
          <>
            <DataGridPremium
              columns={[
                { key: 'id', label: 'Lote', render: (t) => `#${t.id}` },
                { key: 'producto', label: 'Producto', render: (t) => t.producto_nombre },
                { key: 'cantidad_programada', label: 'Cant. Programada', render: (t) => `${t.cantidad_programada} und` },
                { key: 'cantidad_producida', label: 'Cant. Producida', render: (t) => t.cantidad_producida ? `${t.cantidad_producida} und` : '-' },
                { 
                  key: 'estado', 
                  label: 'Estado', 
                  render: (t) => (
                    <span className={`badge ${(t.estado === 'COMPLETADO' || t.estado === 'completado') ? 'badge-success' : 'badge-warning'}`}>
                      {t.estado.toUpperCase()}
                    </span>
                  )
                },
                { 
                  key: 'acciones', 
                  label: 'Acciones', 
                  render: (t) => (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn-edit" onClick={() => verDetalle(t)} title="Ver Detalle"><FaEye /></button>
                      {(t.estado !== 'COMPLETADO' && t.estado !== 'completado') && (
                        <button className="btn-edit" style={{ background: '#10b981', color: 'white' }} onClick={() => finalizarTarea(t.id)} title="Finalizar"><FaCircleCheck /></button>
                      )}
                    </div>
                  )
                }
              ]}
              data={planes}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
            />
          </>
        )}
      </div>

      {/* Modal Crear Producción */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Nuevo Plan de Producción</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Producto</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.producto_id}
                  onChange={(e) => setFormData({...formData, producto_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar Producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input type="date" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cantidad Programada</label>
                <input type="number" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej. 100" value={formData.cantidad_programada} onChange={(e) => setFormData({...formData, cantidad_programada: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>CREAR PLAN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && detailLote && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle del Lote</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Producto</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailLote.producto_nombre}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lote</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{detailLote.id}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(detailLote.fecha).toLocaleDateString()}</div>
              </div>
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cant. Programada</label>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailLote.cantidad_programada} und</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cant. Producida</label>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailLote.cantidad_producida || 0} und</div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado</label>
                <div style={{ fontWeight: 700 }}>
                  {(detailLote.estado === 'COMPLETADO' || detailLote.estado === 'completado') ? 
                    <span style={{ color: '#10b981' }}>Completado</span> : 
                    <span style={{ color: '#f59e0b' }}>Pendiente</span>
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
    </div>
  );
}
