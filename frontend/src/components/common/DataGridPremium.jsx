/**
 * Componente de Cuadrícula de Datos Premium (DataGridPremium)
 * 
 * Una tabla reutilizable con funciones integradas de búsqueda en tiempo real,
 * paginación asíncrona y personalización de renderizado por columna.
 * Puede cambiar dinámicamente entre vista de Tabla o Grid de tarjetas si se envía `renderItem`.
 */
import React from 'react';
import { FaMagnifyingGlass, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

export default function DataGridPremium({ 
  columns = [], 
  data = [], 
  search = '', 
  setSearch, 
  page = 1, 
  setPage, 
  totalPages = 1, 
  totalRecords = 0,
  renderItem // Opcional: Si se pasa, se renderiza como cuadrícula en lugar de tabla
}) {
  return (
    <div className="main-card">
      {/* Barra de Búsqueda */}
      <div className="table-actions-bar">
        <div className="search-input-wrapper">
          <FaMagnifyingGlass className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar en tiempo real..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
          />
        </div>
      </div>

      {/* Contenido: Tabla o Grid */}
      {renderItem ? (
        <div className="grid-layout" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px', 
          padding: '20px',
          background: 'var(--bg-app)'
        }}>
          {data.map(item => renderItem(item))}
          {data.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No se encontraron registros.
            </div>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <th key={index} style={col.style}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.id || index}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} style={col.style}>
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación Profesional */}
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando <strong>{totalRecords > 0 ? (page - 1) * 10 + 1 : 0}</strong> a <strong>{Math.min(page * 10, totalRecords)}</strong> de <strong>{totalRecords}</strong> registros
        </div>
        <div className="pagination-buttons">
          <button className="btn-page" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}><FaChevronLeft /></button>
          <button className="btn-page active">{page}</button>
          <button className="btn-page" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}><FaChevronRight /></button>
        </div>
      </div>
    </div>
  );
}
