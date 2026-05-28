/**
 * Componente del Constructor de Recetas
 * 
 * Módulo que permite diseñar fórmulas de producción (ej. "Masa para Pan Francés").
 * Relaciona una Receta (Cabecera) con múltiples Insumos (Detalle) especificando 
 * las cantidades exactas necesarias por cada lote de producción.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaPlus, FaTrash, FaChevronLeft, FaChevronRight, FaEye, FaKitchenSet } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/recetas.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Recetas() {
  const [recetas, setRecetas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentReceta, setCurrentReceta] = useState(null);
  const [recipeInsumos, setRecipeInsumos] = useState([]);
  const [availableInsumos, setAvailableInsumos] = useState([]);
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');
  const [formData, setFormData] = useState({ nombre_receta: '', descripcion: '' });

  useEffect(() => {
    cargarRecetas();
  }, [page, search]);

  useEffect(() => {
    // Cargar insumos disponibles
    apiFetch('/api/insumos?all=true')
      .then(r => r.json())
      .then(setAvailableInsumos)
      .catch(console.error);
  }, []);

  /**
   * Lista las recetas existentes de forma paginada para mostrarlas en la tabla.
   */
  const cargarRecetas = () => {
    apiFetch(`/api/recetas?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(result => {
        setRecetas(result.data || []);
        setTotalPages(result.meta?.last_page || 1);
        setTotalRecords(result.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setRecetas([]);
      });
  };

  /**
   * Abre el modal en modo Creación (receta = null) o en modo Edición,
   * cargando los insumos guardados asociados a dicha receta.
   */
  const handleOpenModal = async (receta = null) => {
    if (receta) {
      setCurrentReceta(receta);
      setFormData({ nombre_receta: receta.nombre_receta, descripcion: receta.descripcion || '' });
      try {
        const res = await apiFetch(`/api/recetas/${receta.id}`);
        const data = await res.json();
        setRecipeInsumos(data.insumos || []);
      } catch (err) {
        console.error(err);
        setRecipeInsumos([]);
      }
    } else {
      setCurrentReceta(null);
      setFormData({ nombre_receta: '', descripcion: '' });
      setRecipeInsumos([]);
    }
    setShowModal(true);
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

  /**
   * Valida y guarda la receta entera en la base de datos (cabecera y su array de insumos).
   */
  const handleSaveRecipe = async () => {
    if (!formData.nombre_receta) {
      Swal.fire('Error', 'El nombre de la receta es obligatorio', 'error');
      return;
    }

    try {
      const url = currentReceta ? `/api/recetas/${currentReceta.id}` : '/api/recetas';
      const method = currentReceta ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, insumos: recipeInsumos })
      });

      if (res.ok) {
        Swal.fire('¡Éxito!', 'Receta guardada correctamente.', 'success');
        setShowModal(false);
        cargarRecetas();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar la receta', 'error');
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Gestión de Recetas</h2>
          <p className="page-sub">Crea recetas independientes y asígnalas a tus productos.</p>
        </div>
        <button className="btn-new" onClick={() => handleOpenModal()}>
          <FaPlus /> NUEVA RECETA
        </button>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { 
              key: 'nombre_receta', 
              label: 'Receta', 
              render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="client-avatar"><FaKitchenSet /></div>
                  <div className="client-info-box">
                    <span className="client-name">{r.nombre_receta}</span>
                    <span className="client-id-text">ID: #{r.id}</span>
                  </div>
                </div>
              )
            },
            { key: 'descripcion', label: 'Descripción', render: (r) => r.descripcion || '-' },
            { 
              key: 'acciones', 
              label: 'Acciones', 
              render: (r) => (
                <div className="client-actions-div">
                  <button className="btn-edit" style={{ background: '#10b981', color: 'white' }} onClick={() => handleOpenModal(r)} title="Editar Receta"><FaEye /> Editar</button>
                </div>
              )
            }
          ]}
          data={recetas}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>

      {/* Modal Gestionar Receta */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>{currentReceta ? 'Editar Receta' : 'Nueva Receta'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre de la Receta</label>
                <input 
                  type="text" 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }} 
                  placeholder="Ej. Masa para Pan Dulce" 
                  value={formData.nombre_receta} 
                  onChange={(e) => setFormData({...formData, nombre_receta: e.target.value})} 
                  required 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Descripción</label>
                <input 
                  type="text" 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }} 
                  placeholder="Ej. Rendimiento para 50 panes" 
                  value={formData.descripcion} 
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})} 
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agregar Insumos</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px', marginBottom: '15px' }}>
                  <select 
                    className="login-input"
                    style={{ flex: 2, height: '40px', paddingLeft: '10px' }}
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
                    className="login-input"
                    style={{ flex: 1, height: '40px', paddingLeft: '10px' }}
                    placeholder="Cant."
                    value={cantidadInsumo}
                    onChange={(e) => setCantidadInsumo(e.target.value)}
                  />
                  <button className="btn-new" style={{ padding: '0 15px', height: '40px' }} onClick={handleAddInsumo}><FaPlus /></button>
                </div>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px' }}>
                <table className="data-table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Cant.</th>
                      <th>Unidad</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipeInsumos.map(i => (
                      <tr key={i.id_insumo}>
                        <td>{i.insumo}</td>
                        <td>{i.cantidad_necesaria}</td>
                        <td>{i.unidad_medida}</td>
                        <td>
                          <button className="btn-delete" style={{ padding: '5px 8px' }} onClick={() => handleRemoveInsumo(i.id_insumo)}><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                    {recipeInsumos.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center' }}>No hay insumos en esta receta</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn-edit" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn-checkout" style={{ width: 'auto', padding: '0 20px' }} onClick={handleSaveRecipe}>GUARDAR RECETA</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
