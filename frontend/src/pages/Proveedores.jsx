/**
 * Componente Directorio de Proveedores
 * 
 * Interfaz CRUD para administrar la información de los suministradores de la panadería.
 * Permite llevar registro de la Razón Social, Contacto y datos impositivos (RUC).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaTruck, FaPhone, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/proveedores.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailProveedor, setDetailProveedor] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre_empresa: '', nombre_contacto: '', ruc: '', 
    telefono: '', correo: '', direccion: '' 
  });

  useEffect(() => {
    cargarProveedores();
  }, [page, search]);

  /**
   * Pide la lista de proveedores a la API con paginación integrada y actualiza el estado.
   */
  const cargarProveedores = () => {
    apiFetch(`/api/proveedores?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setProveedores(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setProveedores([]);
      });
  };

  /**
   * Guarda un nuevo proveedor o aplica los cambios sobre uno existente (Edición).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/proveedores/${editing.id}` : '/api/proveedores';
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Proveedor guardado correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ 
          nombre_empresa: '', nombre_contacto: '', ruc: '', 
          telefono: '', correo: '', direccion: '' 
        });
        cargarProveedores();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) { 
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el proveedor.', 'error');
    }
  };

  /**
   * Desactiva (Baja lógica/Eliminación) a un proveedor para futuras transacciones de compra.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El proveedor será desactivado.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/proveedores/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Proveedor eliminado.', 'success');
          cargarProveedores();
        }
      } catch (err) { console.error(err); }
    }
  };

  const verDetalle = (proveedor) => {
    setDetailProveedor(proveedor);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Directorio de Proveedores</h2>
          <p className="page-sub">Gestión de proveedores para compras e insumos.</p>
        </div>
        <button className="btn-new" onClick={() => { setEditing(null); setFormData({ nombre_empresa: '', nombre_contacto: '', ruc: '', telefono: '', correo: '', direccion: '' }); setShowModal(true); }}>
          <FaPlus /> REGISTRAR PROVEEDOR
        </button>
      </div>

      <div className="main-card">
        <div className="table-responsive">
        <DataGridPremium
          columns={[
            { 
              key: 'nombre_empresa', 
              label: 'Proveedor', 
              render: (p) => (
                <div className="client-flex-center">
                  <div className="client-avatar"><FaTruck /></div>
                  <div className="client-info-box">
                    <span className="client-name">{p.nombre_empresa}</span>
                    <span className="client-id-text">ID: #{p.id}</span>
                  </div>
                </div>
              )
            },
            { key: 'ruc', label: 'RUC', render: (p) => p.ruc || '-' },
            { key: 'nombre_contacto', label: 'Contacto', render: (p) => p.nombre_contacto || '-' },
            { 
              key: 'telefono', 
              label: 'Teléfono', 
              render: (p) => p.telefono ? (
                <div className="client-phone-badge">
                  <FaPhone className="client-font-small" /> {p.telefono}
                </div>
              ) : '-'
            },
            { key: 'direccion', label: 'Dirección', render: (p) => p.direccion || 'Sin dirección' },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (p) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(p)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-edit" onClick={() => { setEditing(p); setFormData(p); setShowModal(true); }} title="Editar"><FaPencil /></button>
                  <button className="btn-delete" onClick={() => handleDelete(p.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={proveedores}
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
      {showDetailModal && detailProveedor && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-clientes">
            <div className="modal-header">
              <h3 className="client-modal-title">Detalle del Proveedor</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="client-modal-body">
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Razón Social / Empresa</label>
                  <div className="client-value-bold">{detailProveedor.nombre_empresa}</div>
                </div>
                <div>
                  <label className="client-label-mini">Persona de Contacto</label>
                  <div className="client-value-bold">{detailProveedor.nombre_contacto || '-'}</div>
                </div>
              </div>
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">RUC</label>
                  <div className="client-value-bold">{detailProveedor.ruc || '-'}</div>
                </div>
                <div>
                  <label className="client-label-mini">Teléfono</label>
                  <div className="client-value-bold">{detailProveedor.telefono || '-'}</div>
                </div>
              </div>
              <div>
                <label className="client-label-mini">Correo</label>
                <div className="client-value-bold">{detailProveedor.correo || '-'}</div>
              </div>
              <div>
                <label className="client-label-mini">Dirección</label>
                <div className="client-value-bold">{detailProveedor.direccion || '-'}</div>
              </div>
              <div className="client-flex-end">
                <button className="btn-new client-btn-muted" onClick={() => setShowDetailModal(false)}>Cerrar</button>
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
              <h3 className="client-modal-title">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="client-modal-body">
              
              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">Razón Social / Empresa</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Nombre de la empresa" value={formData.nombre_empresa} onChange={(e) => setFormData({...formData, nombre_empresa: e.target.value})} required />
                </div>
                <div>
                  <label className="client-label-mini">Persona de Contacto</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Nombre del contacto" value={formData.nombre_contacto} onChange={(e) => setFormData({...formData, nombre_contacto: e.target.value})} />
                </div>
              </div>

              <div className="form-grid-2-clientes">
                <div>
                  <label className="client-label-mini">RUC</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="RUC" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} />
                </div>
                <div>
                  <label className="client-label-mini">Teléfono</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Teléfono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="client-label-mini">Correo</label>
                <input type="email" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Correo electrónico" value={formData.correo} onChange={(e) => setFormData({...formData, correo: e.target.value})} />
              </div>

              <div>
                <label className="client-label-mini">Dirección</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Dirección completa" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
              </div>

              <div className="client-flex-end">
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-checkout client-btn-submit-custom">{editing ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
