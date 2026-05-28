/**
 * Componente Directorio de Clientes
 * 
 * Interfaz para el manejo del CRM de la panadería. Permite registrar
 * la información de los clientes (DNI/RUC) e inspeccionar su historial de compras
 * para estrategias de fidelización o control de créditos.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaPhone, FaChevronLeft, FaChevronRight, FaEye, FaMagnifyingGlass } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/clientes.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailClient, setDetailClient] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', apellido: '', dni: '', ruc: '', razon_social: '', 
    telefono: '', correo: '', direccion: '' 
  });

  const [search, setSearch] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  // Historial de compras del cliente
  const [clientSales, setClientSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, [page, search]);

  /**
   * Extrae la lista de clientes del servidor con paginación y filtros de búsqueda en memoria compartida.
   */
  const cargarClientes = () => {
    apiFetch(`/api/clientes?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setClientes(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setClientes([]);
      });
  };

  /**
   * Crea o actualiza el registro del cliente en la Base de Datos mediante la API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/clientes/${editing.id}` : '/api/clientes';
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Cliente guardado correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ 
          nombre: '', apellido: '', dni: '', ruc: '', razon_social: '', 
          telefono: '', correo: '', direccion: '' 
        });
        cargarClientes();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) { 
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el cliente.', 'error');
    }
  };

  /**
   * Borrado lógico del cliente. Desactiva al usuario para evitar inconsistencias en el historial de ventas.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El cliente será marcado como inactivo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Cliente eliminado.', 'success');
          cargarClientes();
        }
      } catch (err) { console.error(err); }
    }
  };

  /**
   * Renderiza el modal de detalles y recupera el historial específico de ventas
   * generadas a nombre del cliente seleccionado.
   */
  const verDetalle = (cliente) => {
    setDetailClient(cliente);
    setClientSales([]);
    setLoadingSales(true);
    setShowDetailModal(true);
    apiFetch(`/api/ventas?cliente_id=${cliente.id}&all=true`)
      .then(r => r.json())
      .then(data => {
        setClientSales(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Error fetching client sales:', err);
        setClientSales([]);
      })
      .finally(() => {
        setLoadingSales(false);
      });
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Directorio de Clientes</h2>
          <p className="page-sub">Gestión de cartera de clientes para ventas y fidelización.</p>
        </div>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <FaPlus /> REGISTRAR CLIENTE
        </button>
      </div>

      <DataGridPremium
        columns={[
          { 
            key: 'cliente', 
            label: 'Cliente',
            render: (c) => (
              <div className="client-flex-center">
                <div className="client-avatar">{c.nombre.charAt(0).toUpperCase()}</div>
                <div className="client-info-box">
                  <span className="client-name">{c.nombre} {c.apellido || ''}</span>
                  <span className="client-id-text">ID: #{c.id}</span>
                </div>
              </div>
            )
          },
          { key: 'dni', label: 'DNI / RUC', render: (c) => c.dni || c.ruc || '-' },
          { 
            key: 'telefono', 
            label: 'Teléfono',
            render: (c) => c.telefono ? (
              <div className="client-phone-badge">
                <FaPhone className="client-font-small" /> {c.telefono}
              </div>
            ) : '-'
          },
          { key: 'correo', label: 'Correo' },
          { key: 'direccion', label: 'Dirección', render: (c) => c.direccion || 'Sin dirección' },
          { 
            key: 'acciones', 
            label: 'Acciones',
            render: (c) => (
              <div className="client-actions-div">
                <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(c)} title="Ver Detalle"><FaEye /></button>
                <button className="btn-edit" onClick={() => { setEditing(c); setFormData(c); setShowModal(true); }} title="Editar"><FaPencil /></button>
                <button className="btn-delete" onClick={() => handleDelete(c.id)} title="Eliminar"><FaTrash /></button>
              </div>
            )
          }
        ]}
        data={clientes}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
      />

      {/* Modal Detalle */}
      {showDetailModal && detailClient && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-clientes">
            <div className="modal-header">
              <h3 className="client-modal-title">Detalle del Cliente</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="client-modal-body">
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Nombre</label>
                  <div className="client-value-bold">{detailClient.nombre}</div>
                </div>
                <div>
                  <label className="client-label-mini">Apellido</label>
                  <div className="client-value-bold">{detailClient.apellido || '-'}</div>
                </div>
              </div>
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">DNI</label>
                  <div className="client-value-bold">{detailClient.dni || '-'}</div>
                </div>
                <div>
                  <label className="client-label-mini">RUC</label>
                  <div className="client-value-bold">{detailClient.ruc || '-'}</div>
                </div>
              </div>
              <div>
                <label className="client-label-mini">Razón Social</label>
                <div className="client-value-bold">{detailClient.razon_social || '-'}</div>
              </div>
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Teléfono</label>
                  <div className="client-value-bold">{detailClient.telefono || '-'}</div>
                </div>
                <div>
                  <label className="client-label-mini">Correo</label>
                  <div className="client-value-bold">{detailClient.correo || '-'}</div>
                </div>
              </div>
              <div>
                <label className="client-label-mini">Dirección</label>
                <div className="client-value-bold">{detailClient.direccion || '-'}</div>
              </div>

              {/* Historial de Compras */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>Historial de Compras ({clientSales.length} compras)</h4>
                {loadingSales ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Cargando historial de compras...</div>
                ) : clientSales.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No se registran compras para este cliente.</div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'var(--bg-app)' }}>
                    {clientSales.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Venta #{v.id}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(v.fecha_venta).toLocaleDateString()} a las {v.hora_venta.substring(0, 5)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>S/ {Number(v.total).toFixed(2)}</div>
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontWeight: 600 }}>{v.tipo_pago}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="client-flex-end" style={{ marginTop: '20px' }}>
                <button 
                  type="button" 
                  style={{ 
                    background: '#64748b', 
                    color: 'white', 
                    border: 'none', 
                    height: '40px', 
                    padding: '0 24px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => setShowDetailModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-clientes">
            <div className="modal-header">
              <h3 className="client-modal-title">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button className="btn-close" onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', apellido: '', dni: '', ruc: '', razon_social: '', telefono: '', correo: '', direccion: '' }); }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="client-modal-body">
              
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Nombre</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Juan" value={formData.nombre || ''} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
                </div>
                <div>
                  <label className="client-label-mini">Apellido</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Silva" value={formData.apellido || ''} onChange={(e) => setFormData({...formData, apellido: e.target.value})} />
                </div>
              </div>

              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">DNI</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 71234567 (8 dígitos)" value={formData.dni || ''} onChange={(e) => setFormData({...formData, dni: e.target.value})} />
                </div>
                <div>
                  <label className="client-label-mini">RUC</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 20123456789 (11 dígitos)" value={formData.ruc || ''} onChange={(e) => setFormData({...formData, ruc: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="client-label-mini">Razón Social</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Panadería El Rincón S.A.C." value={formData.razon_social || ''} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} />
              </div>

              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Teléfono</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 987654321" value={formData.telefono || ''} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="client-label-mini">Correo</label>
                  <input type="email" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: cliente@correo.com" value={formData.correo || ''} onChange={(e) => setFormData({...formData, correo: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="client-label-mini">Dirección</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Av. Las Palmeras 123 - Lima" value={formData.direccion || ''} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
              </div>

              <div className="client-flex-end" style={{ marginTop: '20px', gap: '10px' }}>
                <button 
                  type="button" 
                  style={{ 
                    background: '#64748b', 
                    color: 'white', 
                    border: 'none', 
                    height: '40px', 
                    padding: '0 20px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', apellido: '', dni: '', ruc: '', razon_social: '', telefono: '', correo: '', direccion: '' }); }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    height: '40px', 
                    padding: '0 20px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {editing ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
