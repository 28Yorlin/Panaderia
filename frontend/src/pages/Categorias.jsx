/**
 * Componente de Categorías de Productos
 * 
 * Permite organizar el catálogo de la panadería creando grupos
 * taxonómicos (ej: Panes, Postres, Bebidas) que luego facilitan la búsqueda en el POS.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaPencil, FaTrash, FaTags, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/categorias.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailCategoria, setDetailCategoria] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    cargarCategorias();
  }, [page, search]);

  /**
   * Pide la lista de categorías existentes a la API.
   */
  const cargarCategorias = () => {
    apiFetch(`/api/categorias?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setCategorias(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setCategorias([]);
      });
  };

  /**
   * Guarda o actualiza los datos de la categoría en el servidor.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/categorias/${editing.id}` : '/api/categorias';
    try {
      const res = await apiFetch(url, { method, body: JSON.stringify(formData) });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Categoría guardada correctamente.', 'success');
        setShowModal(false);
        setEditing(null);
        setFormData({ nombre: '', descripcion: '' });
        cargarCategorias();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) { 
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar la categoría.', 'error');
    }
  };

  /**
   * Realiza un borrado lógico de la categoría (si no posee productos asociados).
   */
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "La categoría será desactivada.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/categorias/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Categoría eliminada.', 'success');
          cargarCategorias();
        }
      } catch (err) { console.error(err); }
    }
  };

  const verDetalle = (categoria) => {
    setDetailCategoria(categoria);
    setShowDetailModal(true);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Categorías de Productos</h2>
          <p className="page-sub">Gestión de categorías para organizar el inventario.</p>
        </div>
        <button className="btn-new" onClick={() => { setEditing(null); setFormData({ nombre: '', descripcion: '' }); setShowModal(true); }}>
          <FaPlus /> NUEVA CATEGORÍA
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { 
              key: 'nombre', 
              label: 'Categoría', 
              render: (c) => (
                <div className="category-flex-center">
                  <div className="category-avatar"><FaTags /></div>
                  <div className="category-info-box">
                    <span className="category-name">{c.nombre}</span>
                    <span className="category-id-text">ID: #{c.id}</span>
                  </div>
                </div>
              )
            },
            { key: 'descripcion', label: 'Descripción', render: (c) => c.descripcion || '-' },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (c) => (
                <div className="category-actions-div">
                  <button className="btn-edit" style={{ background: '#3b82f6', color: 'white' }} onClick={() => verDetalle(c)} title="Ver Detalle"><FaEye /></button>
                  <button className="btn-edit" onClick={() => { setEditing(c); setFormData({ nombre: c.nombre, descripcion: c.descripcion || '' }); setShowModal(true); }} title="Editar"><FaPencil /></button>
                  <button className="btn-delete" onClick={() => handleDelete(c.id)} title="Eliminar"><FaTrash /></button>
                </div>
              )
            }
          ]}
          data={categorias}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Detalle */}
      {showDetailModal && detailCategoria && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-categorias">
            <div className="modal-header">
              <h3 className="category-modal-title">Detalle de la Categoría</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="category-modal-body">
              <div>
                <label className="category-label-mini">Nombre</label>
                <div className="category-value-bold">{detailCategoria.nombre}</div>
              </div>
              <div>
                <label className="category-label-mini">Descripción</label>
                <div className="category-value-bold">{detailCategoria.descripcion || '-'}</div>
              </div>

              <div className="category-flex-end">
                <button className="btn-new category-btn-muted" onClick={() => setShowDetailModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-categorias">
            <div className="modal-header">
              <h3 className="category-modal-title">{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button className="btn-close" onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', descripcion: '' }); }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="category-modal-body">
              <div>
                <label className="category-label-mini">Nombre</label>
                <input type="text" className="login-input category-input-standard" placeholder="Nombre de la categoría" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
              </div>
              <div>
                <label className="category-label-mini">Descripción</label>
                <textarea className="login-input category-textarea-standard" placeholder="Descripción (opcional)" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div className="category-flex-end">
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => { setShowModal(false); setEditing(null); setFormData({ nombre: '', descripcion: '' }); }}>Cancelar</button>
                <button type="submit" className="btn-checkout category-btn-submit-custom">{editing ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
