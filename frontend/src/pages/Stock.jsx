/**
 * Componente de Control de Stock
 * 
 * Tabla enfocada en la revisión de los niveles de inventario.
 * Detecta y alerta visualmente cuando el stock actual es menor o igual
 * al stock mínimo permitido para un producto.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaBox, FaCircleExclamation, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import '../assets/styles/stock.css';

export default function Stock() {
  const [productos, setProductos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, [page]);

  /**
   * Consulta el stock general paginado desde la API.
   */
  const cargarProductos = () => {
    setLoading(true);
    apiFetch(`/api/productos?page=${page}&limit=10`)
      .then(r => r.json())
      .then(data => {
        setProductos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
      })
      .catch(err => {
        console.error(err);
        setProductos([]);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Control de Stock</h2>
          <p className="page-sub">Monitoreo en tiempo real de niveles de inventario y alertas de reposición.</p>
        </div>
      </div>

      <div className="main-card">
        {loading ? (
          <div className="loading-box">Cargando stock...</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => {
                    const lowStock = p.stock_actual <= p.stock_minimo;
                    return (
                      <tr key={p.id}>
                        <td>{p.nombre}</td>
                        <td style={{ fontWeight: 800, color: lowStock ? '#ef4444' : 'inherit' }}>
                          {p.stock_actual}
                        </td>
                        <td>{p.stock_minimo}</td>
                        <td>
                          {lowStock ? (
                            <span className="badge badge-danger">
                              <FaCircleExclamation /> Stock Bajo
                            </span>
                          ) : (
                            <span className="badge badge-success">Óptimo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination-box">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <FaChevronLeft />
              </button>
              <span className="pagination-text">Página {page} de {totalPages}</span>
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <FaChevronRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
