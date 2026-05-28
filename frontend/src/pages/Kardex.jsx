/**
 * Componente Kárdex de Inventario
 * 
 * Muestra el historial inmutable de movimientos físicos de los productos en almacén.
 * Facilita la auditoría de Entradas (compras, producción) y Salidas (ventas, mermas).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaBox, FaArrowDown, FaArrowUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import '../assets/styles/kardex.css';
import '../assets/styles/crud.css'; // Reutilizamos estilos de CRUD

export default function Kardex() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProductos();
    cargarKardex();
  }, []);

  useEffect(() => {
    cargarKardex();
  }, [selectedProducto]);

  /**
   * Carga la lista completa de productos para el combo de filtrado.
   */
  const cargarProductos = async () => {
    try {
      const res = await apiFetch('/api/productos?all=true');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Solicita el kárdex general o el específico de un producto seleccionado.
   */
  const cargarKardex = async () => {
    setLoading(true);
    try {
      let url = '/api/kardex';
      if (selectedProducto) {
        url += `?producto_id=${selectedProducto}`;
      }
      const res = await apiFetch(url);
      const data = await res.json();
      setMovimientos(data);
    } catch (err) {
      console.error(err);
      setMovimientos([]);
    }
    setLoading(false);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Kárdex de Inventario</h2>
          <p className="page-sub">Seguimiento detallado de entradas y salidas de productos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Filtrar por Producto:</label>
          <select 
            className="form-control" 
            style={{ width: '200px' }}
            value={selectedProducto}
            onChange={(e) => setSelectedProducto(e.target.value)}
          >
            <option value="">Todos los productos</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="main-card">
        {loading ? (
          <div className="loading-box">Cargando kárdex...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th>Motivo</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No hay movimientos registrados para este producto.
                    </td>
                  </tr>
                ) : (
                  movimientos.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold' }}>{m.producto_nombre}</td>
                      <td>
                        <span className={`badge ${m.tipo_movimiento === 'ENTRADA' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {m.tipo_movimiento === 'ENTRADA' ? <FaArrowDown /> : <FaArrowUp />}
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: m.tipo_movimiento === 'ENTRADA' ? 'var(--success)' : 'var(--danger)' }}>
                        {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                      </td>
                      <td>
                        <span className="badge badge-info">{m.motivo}</span>
                      </td>
                      <td>{m.usuario_nombre || 'Sistema'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
