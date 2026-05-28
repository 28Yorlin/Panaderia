/**
 * Componente Gestión de Roles
 * 
 * Interfaz para definir jerarquías de usuarios y configurar a qué
 * módulos de la aplicación tiene acceso cada perfil.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaUserShield, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/roles.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermisosModal, setShowPermisosModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ nombre: '' });
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
  
  const modulosDisponibles = ['PRINCIPAL', 'VENTAS', 'PRODUCCIÓN', 'INVENTARIO', 'COMPRAS', 'FINANZAS', 'ADMINISTRACIÓN'];

  useEffect(() => {
    cargarRoles();
  }, []);

  /**
   * Solicita el catálogo completo de roles desde el backend.
   */
  const cargarRoles = () => {
    apiFetch('/api/roles')
      .then(r => r.json())
      .then(setRoles)
      .catch(console.error);
  };

  const filteredRoles = roles.filter(r => 
    r.nombre.toLowerCase().includes(search.toLowerCase())
  );

  /**
   * Agrega o edita el nombre de un rol existente.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/roles/${editing.id}` : '/api/roles';
    
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Rol guardado correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ nombre: '' });
        cargarRoles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Elimina un rol. Podría fallar en Backend si hay usuarios amarrados a él.
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Se eliminará el rol.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/roles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Rol eliminado.', 'success');
          cargarRoles();
        }
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Gestión de Roles</h2>
          <p className="page-sub">Control de roles y permisos del sistema.</p>
        </div>
        <button className="btn-new" onClick={() => { setEditing(null); setFormData({ nombre: '' }); setShowModal(true); }}>
          <FaPlus /> NUEVO ROL
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { key: 'id', label: 'ID', render: (r) => `#${r.id}` },
            { 
              key: 'nombre', 
              label: 'Nombre del Rol', 
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="user-avatar-box"><FaUserShield /></div>
                  <span className="user-name-text">{r.nombre}</span>
                </div>
              )
            },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (r) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: 'var(--info)', color: 'white' }} onClick={() => {
                    setSelectedRole(r);
                    try {
                      setPermisosSeleccionados(r.permisos ? JSON.parse(r.permisos) : []);
                    } catch (e) {
                      setPermisosSeleccionados([]);
                    }
                    setShowPermisosModal(true);
                  }} title="Gestionar Permisos"><FaUserShield /></button>
                  <button className="btn-edit" onClick={() => { setEditing(r); setFormData({ nombre: r.nombre }); setShowModal(true); }} title="Editar"><FaPencil /></button>
                  <button className="btn-delete" onClick={() => handleDelete(r.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={filteredRoles}
          search={search}
          setSearch={setSearch}
          page={1}
          setPage={() => {}}
          totalPages={1}
          totalRecords={filteredRoles.length}
        />
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button className="btn-close" onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '' }); }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre del Rol</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej. Supervisor" value={formData.nombre} onChange={(e) => setFormData({ nombre: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '' }); }}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>{editing ? 'GUARDAR' : 'REGISTRAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Permisos */}
      {showPermisosModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Permisos: {selectedRole?.nombre}</h3>
              <button className="btn-close" onClick={() => setShowPermisosModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Selecciona los módulos a los que este rol tendrá acceso:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {modulosDisponibles.map(mod => (
                  <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-main)' }}>
                    <input 
                      type="checkbox" 
                      checked={permisosSeleccionados.includes(mod)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermisosSeleccionados([...permisosSeleccionados, mod]);
                        } else {
                          setPermisosSeleccionados(permisosSeleccionados.filter(m => m !== mod));
                        }
                      }}
                    />
                    {mod}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowPermisosModal(false)}>Cancelar</button>
                <button type="button" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }} onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/roles/${selectedRole.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        nombre: selectedRole.nombre,
                        permisos: JSON.stringify(permisosSeleccionados)
                      })
                    });
                    if (res.ok) {
                      Swal.fire('¡Éxito!', 'Permisos actualizados.', 'success');
                      setShowPermisosModal(false);
                      cargarRoles();
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}>GUARDAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
