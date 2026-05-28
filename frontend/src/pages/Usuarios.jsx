/**
 * Componente de Gestión de Usuarios y Accesos
 * 
 * Panel de administración exclusivo para gestionar las credenciales de
 * inicio de sesión de los colaboradores. Soporta bloqueos de cuentas y asignación
 * de roles operativos (Administrador, Panadero, Vendedor).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaUserShield, FaChevronLeft, FaChevronRight, FaEye, FaUserSlash, FaUserCheck } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/usuarios.css';
import DataGridPremium from '../components/common/DataGridPremium';
import { useAuth } from '../context/AuthContext';

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUsuario, setDetailUsuario] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', apellido: '', username: '', password: '', email: '', rol_id: '', estado: 1 
  });

  useEffect(() => {
    cargarUsuarios();
  }, [page, search]);

  useEffect(() => {
    cargarRoles();
  }, []);

  /**
   * Obtiene la tabla de usuarios con paginación integrada.
   */
  const cargarUsuarios = () => {
    apiFetch(`/api/usuarios?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setUsuarios(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setUsuarios([]);
      });
  };

  const cargarRoles = () => {
    apiFetch('/api/roles')
      .then(r => r.json())
      .then(setRoles)
      .catch(console.error);
  };

  /**
   * Transforma el ID de rol numérico en una etiqueta de interfaz descriptiva.
   */
  const getRoleLabel = (rol_id) => {
    const rol = roles.find(r => r.id === rol_id);
    if (!rol) return { label: 'Usuario', class: 'role-vendedor' };
    
    if (rol.nombre.toUpperCase().includes('ADMIN')) return { label: rol.nombre.toUpperCase(), class: 'role-admin' };
    if (rol.nombre.toUpperCase().includes('PANA')) return { label: rol.nombre.toUpperCase(), class: 'role-panadero' };
    return { label: rol.nombre.toUpperCase(), class: 'role-vendedor' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/usuarios/${editing.id}` : '/api/usuarios';
    
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Usuario guardado correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ nombre: '', apellido: '', username: '', password: '', email: '', rol_id: '', estado: 1 });
        cargarUsuarios();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el usuario.', 'error');
    }
  };

  const verDetalle = (usuario) => {
    setDetailUsuario(usuario);
    setShowDetailModal(true);
  };

  /**
   * Alterna el estado del usuario entre Activo (1) y Suspendido (0).
   * Impide mediante validaciones que el usuario en sesión pueda bloquearse a sí mismo.
   */
  const handleToggleEstado = async (usuario) => {
    if (parseInt(usuario.id) === currentUser?.id) {
      return Swal.fire('Acción Bloqueada', 'No puedes suspender tu propia cuenta por razones de seguridad.', 'warning');
    }

    const nuevoEstado = usuario.estado ? 0 : 1;
    const accionText = nuevoEstado ? 'activar' : 'suspender';
    
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `El usuario será ${nuevoEstado ? 'activado' : 'suspendido'}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: `Sí, ${accionText}`
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/usuarios/${usuario.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...usuario,
            estado: nuevoEstado
          })
        });
        if (res.ok) {
          Swal.fire('¡Éxito!', `Usuario ${nuevoEstado ? 'activado' : 'suspendido'} correctamente.`, 'success');
          cargarUsuarios();
        } else {
          const errData = await res.json();
          Swal.fire('Error', errData.error || `No se pudo ${accionText} al usuario.`, 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', `Ocurrió un error al intentar ${accionText} al usuario.`, 'error');
      }
    }
  };

  /**
   * Elimina un usuario de forma definitiva. También protege al usuario en sesión
   * actual para que no se autodestruya accidentalmente.
   */
  const handleDelete = async (id) => {
    if (parseInt(id) === currentUser?.id) {
      return Swal.fire('Acción Bloqueada', 'No puedes eliminar tu propia cuenta por razones de seguridad.', 'warning');
    }

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El usuario será eliminado permanentemente del sistema.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar de verdad'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Usuario eliminado de forma definitiva.', 'success');
          cargarUsuarios();
        } else {
          const errData = await res.json();
          Swal.fire('No se pudo eliminar', errData.error || 'Ocurrió un error al intentar eliminar el usuario.', 'warning');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Ocurrió un error al intentar eliminar el usuario.', 'error');
      }
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Gestión de Usuarios</h2>
          <p className="page-sub">Control de personal y permisos de acceso al sistema.</p>
        </div>
        <button className="btn-new" onClick={() => { setEditing(null); setFormData({ nombre: '', apellido: '', username: '', password: '', email: '', rol_id: '', estado: 1 }); setShowModal(true); }}>
          <FaPlus /> NUEVO USUARIO
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { 
              key: 'colaborador', 
              label: 'Colaborador', 
              render: (u) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="user-avatar-box"><FaUserShield /></div>
                  <div>
                    <div className="user-name-text">{u.nombre} {u.apellido}</div>
                    <div className="user-email-text">{u.email}</div>
                  </div>
                </div>
              )
            },
            { key: 'username', label: 'Usuario', render: (u) => `@${u.username}` },
            { 
              key: 'rol_id', 
              label: 'Rol', 
              render: (u) => {
                const role = getRoleLabel(u.rol_id);
                return <span className={`user-role-badge ${role.class}`}>{role.label}</span>;
              }
            },
            { 
              key: 'estado', 
              label: 'Estado', 
              render: (u) => (
                <div className="user-status-text">
                  <span className={`user-status-dot ${u.estado ? 'dot-active' : 'dot-inactive'}`}></span>
                  {u.estado ? 'Activo' : 'Suspendido'}
                </div>
              )
            },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (u) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(u)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-edit" onClick={() => { setEditing(u); setFormData({ ...u, password: '' }); setShowModal(true); }} title="Editar"><FaPencil /></button>
                  <button 
                    className={`btn-status-toggle ${u.estado ? 'active-user' : 'suspended-user'}`} 
                    onClick={() => handleToggleEstado(u)} 
                    title={u.estado ? "Suspender Usuario" : "Activar Usuario"}
                  >
                    {u.estado ? <FaUserSlash /> : <FaUserCheck />}
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(u.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={usuarios}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Carlos" value={formData.nombre || ''} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Apellido</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: García" value={formData.apellido || ''} onChange={(e) => setFormData({...formData, apellido: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre de Usuario</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: admin_garcia" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
              </div>

              {!editing && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contraseña</label>
                  <input type="password" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Mínimo 6 caracteres" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
                <input type="email" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: carlos@panaderia.com" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rol</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.rol_id || ''}
                  onChange={(e) => setFormData({...formData, rol_id: e.target.value})}
                  disabled={editing && editing.id === currentUser?.id}
                  required
                >
                  <option value="">Seleccionar Rol...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.estado !== undefined ? formData.estado : 1}
                  onChange={(e) => setFormData({...formData, estado: parseInt(e.target.value)})}
                  disabled={editing && editing.id === currentUser?.id}
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Suspendido</option>
                </select>
                {editing && editing.id === currentUser?.id && (
                  <span className="text-warning-muted" style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '4px', display: 'block' }}>
                    No puedes cambiar tu propio rol o estado por razones de seguridad.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>{editing ? 'GUARDAR' : 'REGISTRAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && detailUsuario && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Detalle del Usuario</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailUsuario.nombre} {detailUsuario.apellido}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuario</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>@{detailUsuario.username}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detailUsuario.email}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rol</label>
                <div>
                  <span className={`user-role-badge ${getRoleLabel(detailUsuario.rol_id).class}`}>
                    {getRoleLabel(detailUsuario.rol_id).label}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado</label>
                <div style={{ fontWeight: 700 }}>
                  {detailUsuario.estado ? 
                    <span style={{ color: '#10b981' }}>Activo</span> : 
                    <span style={{ color: '#ef4444' }}>Suspendido</span>
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
