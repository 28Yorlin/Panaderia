/**
 * Componente del Catálogo de Productos
 * 
 * Administra los artículos terminados disponibles para la venta.
 * Soporta carga de imágenes, definición de stock inicial y la vinculación a recetas 
 * de producción (Módulo de Producción).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { API_BASE } from '../services/api';
import { FaPlus, FaPencil, FaTrash, FaCircleExclamation, FaBoxOpen, FaChevronLeft, FaChevronRight, FaWheatAwn, FaMagnifyingGlass } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/productos.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', precio: '', stock_actual: '', stock_minimo: '', categoria_id: 1, receta_id: '' });
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [recipeInsumos, setRecipeInsumos] = useState([]);
  const [availableInsumos, setAvailableInsumos] = useState([]);
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');

  const [search, setSearch] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [recetas, setRecetas] = useState([]);

  useEffect(() => {
    cargarProductos();
  }, [page, search]);

  useEffect(() => {
    apiFetch('/api/categorias?all=true')
      .then(r => r.json())
      .then(setCategorias)
      .catch(console.error);
  }, []);

  useEffect(() => {
    apiFetch('/api/recetas?all=true')
      .then(r => r.json())
      .then(r => setRecetas(Array.isArray(r) ? r : (r.data || [])))
      .catch(console.error);
  }, []);


  /**
   * Carga la tabla de productos paginada desde la API, inyectando el total de registros en el estado.
   */
  const cargarProductos = () => {
    apiFetch(`/api/productos?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setProductos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setProductos([]);
      });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  };

  const resetModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormData({ nombre: '', descripcion: '', precio: '', stock_actual: '', stock_minimo: '', categoria_id: 1, receta_id: '' });
    setImagenFile(null);
    setImagenPreview(null);
  };

  /**
   * Envía los datos del nuevo producto o su actualización.
   * Emplea `FormData` en lugar de JSON estándar para poder adjuntar la imagen binaria (`File`).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/productos/${editing.id}` : '/api/productos';
    
    try {
      // Usamos FormData para poder enviar archivos
      const data = new FormData();
      data.append('nombre', formData.nombre);
      data.append('descripcion', formData.descripcion || '');
      data.append('precio', formData.precio);
      data.append('stock_actual', formData.stock_actual || 0);
      data.append('categoria_id', formData.categoria_id || 1);
      data.append('vida_util_dias', formData.vida_util_dias || '');
      if (imagenFile) data.append('imagen', imagenFile);

      const res = await apiFetch(url, { method, body: data, isFormData: true });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Producto guardado correctamente.', 'success');
        resetModal();
        cargarProductos();
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el producto.', 'error');
    }
  };

  /**
   * Abre el modal de recetas de producción.
   * Un producto puede tener una receta (lista de insumos + cantidades) para su automatización.
   */
  const handleManageRecipe = async (producto) => {
    setCurrentProduct(producto);
    try {
      if (availableInsumos.length === 0) {
        const resIns = await apiFetch('/api/insumos?all=true');
        const dataIns = await resIns.json();
        setAvailableInsumos(dataIns || []);
      }
      
      try {
        const res = await apiFetch(`/api/recetas/${producto.id}`);
        if (res.ok) {
          const data = await res.json();
          setRecipeInsumos(Array.isArray(data) ? data : []);
        } else {
          setRecipeInsumos([]);
        }
      } catch (err) {
        console.error("Error al cargar receta:", err);
        setRecipeInsumos([]);
      }
      
      setShowRecipeModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar los insumos', 'error');
    }
  };

  const handleAddInsumo = () => {
    if (!selectedInsumo || !cantidadInsumo) return;
    const insumoObj = availableInsumos.find(i => i.id === parseInt(selectedInsumo));
    if (!insumoObj) return;

    if (recipeInsumos.find(i => i.id_insumo === insumoObj.id)) {
      Swal.fire('Aviso', 'Este insumo ya está en la receta', 'warning');
      return;
    }

    setRecipeInsumos([...recipeInsumos, {
      id_insumo: insumoObj.id,
      insumo: insumoObj.nombre,
      unidad_medida: insumoObj.unidad_medida,
      cantidad_necesaria: parseFloat(cantidadInsumo)
    }]);
    setSelectedInsumo('');
    setCantidadInsumo('');
  };

  const handleRemoveInsumo = (id_insumo) => {
    setRecipeInsumos(recipeInsumos.filter(i => i.id_insumo !== id_insumo));
  };

  const handleSaveRecipe = async () => {
    try {
      const res = await apiFetch(`/api/recetas/${currentProduct.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumos: recipeInsumos })
      });
      if (res.ok) {
        Swal.fire('¡Éxito!', 'Receta guardada correctamente.', 'success');
        setShowRecipeModal(false);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar la receta', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "El producto será marcado como inactivo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire('Eliminado', 'Producto eliminado.', 'success');
          cargarProductos();
        }
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Gestión de Productos</h2>
          <p className="page-sub">Inventario de productos finales y control de existencias.</p>
        </div>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <FaPlus /> NUEVO PRODUCTO
        </button>
      </div>

      <DataGridPremium
        columns={[
          { 
            key: 'producto', 
            label: 'Producto',
            render: (p) => (
              <div className="product-flex-center">
                {p.imagen
                  ? <img src={`${API_BASE}/uploads/productos/${p.imagen}`} alt={p.nombre} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--border)' }} />
                  : <div className="product-icon-box"><FaBoxOpen /></div>
                }
                <span className="product-name-text">{p.nombre}</span>
              </div>
            )
          },
          { key: 'descripcion', label: 'Descripción', render: (p) => p.descripcion || '-' },
          { key: 'precio', label: 'Precio', render: (p) => `S/ ${Number(p.precio || 0).toFixed(2)}` },
          { 
            key: 'stock', 
            label: 'Stock',
            render: (p) => (
              <div className={p.stock_actual <= p.stock_minimo ? 'product-stock-alert' : ''}>
                {p.stock_actual} {p.stock_actual <= p.stock_minimo && <FaCircleExclamation />}
              </div>
            )
          },
          { 
            key: 'estado', 
            label: 'Estado',
            render: (p) => (
              <span className={`badge ${p.stock_actual > 0 ? 'badge-success' : 'badge-danger'}`}>
                {p.stock_actual > 0 ? 'EN STOCK' : 'AGOTADO'}
              </span>
            )
          },
          { 
            key: 'acciones', 
            label: 'Acciones',
            render: (p) => (
              <div className="product-actions-div">
                <button className="btn-edit" style={{ background: '#10b981', color: 'white' }} onClick={() => handleManageRecipe(p)} title="Receta"><FaWheatAwn /></button>
                <button className="btn-edit" onClick={() => { setEditing(p); setFormData({...p, categoria_id: p.categoria_id || 1}); setImagenFile(null); setImagenPreview(p.imagen ? `${API_BASE}/uploads/productos/${p.imagen}` : null); setShowModal(true); }}><FaPencil /></button>
                <button className="btn-delete" onClick={() => handleDelete(p.id)}><FaTrash /></button>
              </div>
            )
          }
        ]}
        data={productos}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
      />

      {/* Modal Receta */}
      {showRecipeModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-medium">
            <div className="modal-header">
              <h3 className="product-modal-title">Receta de: {currentProduct?.nombre}</h3>
              <button className="btn-close" onClick={() => setShowRecipeModal(false)}>×</button>
            </div>
            <div className="product-modal-body">
              <div className="product-flex-gap-10">
                <select 
                  className="input-select-modern product-flex-2"
                  value={selectedInsumo}
                  onChange={(e) => setSelectedInsumo(e.target.value)}
                >
                  <option value="">Seleccionar Insumo</option>
                  {availableInsumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  className="input-select-modern product-flex-1"
                  placeholder="Cant."
                  value={cantidadInsumo}
                  onChange={(e) => setCantidadInsumo(e.target.value)}
                />
                <button className="btn-new product-padding-btn" onClick={handleAddInsumo}>+</button>
              </div>

              <div className="product-scroll-table">
                <table className="data-table product-font-small">
                  <thead>
                    <tr><th>Insumo</th><th>Cant.</th><th>Unidad</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {recipeInsumos.map(i => (
                      <tr key={i.id_insumo}>
                        <td style={{ color: 'var(--text-main)' }}>{i.insumo}</td>
                        <td style={{ color: 'var(--text-main)', fontWeight: 700 }}>{i.cantidad_necesaria}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{i.unidad_medida}</td>
                        <td>
                          <button className="btn-delete product-padding-mini-btn" onClick={() => handleRemoveInsumo(i.id_insumo)}><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                    {recipeInsumos.length === 0 && (
                      <tr><td colSpan="4" className="product-text-center">No hay insumos en esta receta</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button className="btn-checkout product-full-width-btn" onClick={handleSaveRecipe}>GUARDAR RECETA</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-width-small">
            <div className="modal-header">
              <h3 className="product-modal-title">{editing ? 'Editar Producto' : 'Crear Producto'}</h3>
              <button className="btn-close" onClick={resetModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="product-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label className="product-label-mini">Nombre</label>
                <input type="text" className="login-input product-input-standard" style={{ paddingLeft: '10px' }} placeholder="Nombre del producto" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
              </div>
              <div>
                <label className="product-label-mini">Descripción</label>
                <input type="text" className="login-input product-input-standard" style={{ paddingLeft: '10px' }} placeholder="Descripción corta" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div>
                <label className="product-label-mini">Categoría</label>
                <select 
                  className="login-input product-input-standard" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar Categoría...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="product-label-mini">Receta (Opcional)</label>
                <select 
                  className="login-input product-input-standard" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={formData.receta_id || ''}
                  onChange={(e) => setFormData({...formData, receta_id: e.target.value})}
                >
                  <option value="">Sin Receta</option>
                  {recetas.map(r => <option key={r.id} value={r.id}>{r.nombre_receta}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="product-label-mini">Precio (S/)</label>
                  <input type="number" step="0.01" className="login-input product-input-standard" style={{ paddingLeft: '10px' }} placeholder="0.00" value={formData.precio} onChange={(e) => setFormData({...formData, precio: e.target.value})} required />
                </div>
                <div>
                  <label className="product-label-mini">Stock Inicial</label>
                  <input type="number" className="login-input product-input-standard" style={{ paddingLeft: '10px' }} placeholder="0" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} required />
                </div>
              </div>

              {/* Campo de imagen */}
              <div>
                <label className="product-label-mini">Imagen del Producto (Opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  {imagenPreview
                    ? <img src={imagenPreview} alt="Vista previa" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--primary)' }} />
                    : <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--bg-card)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 22 }}><FaBoxOpen /></div>
                  }
                  <label htmlFor="img-upload" style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-block' }}>
                    {imagenFile ? '✓ Imagen seleccionada' : editing?.imagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  </label>
                  <input id="img-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  {imagenFile && <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imagenFile.name}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={resetModal}>Cancelar</button>
                <button type="submit" className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }}>{editing ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
