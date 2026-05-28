/**
 * Componente de Historial Global (Bitácora)
 * 
 * Interfaz unificada que presenta los registros históricos de 4 módulos principales:
 * Ventas, Compras, Producción y Stock.
 * Soporta paginación, filtros por fecha, impresión de tickets y exportación a CSV (Excel).
 */
import React, { useState, useEffect } from 'react';
import { FaCartShopping, FaFireBurner, FaBoxesStacked, FaChevronLeft, FaChevronRight, FaTruck, FaEye } from 'react-icons/fa6';
import { apiFetch } from '../services/http';
import Swal from 'sweetalert2';
import '../assets/styles/historial.css';

export default function Historial() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [activeTab, page, search, fechaFiltro]);

  /**
   * Abre un modal con el detalle específico (items) de la Venta o Compra seleccionada.
   */
  const verDetalle = async (id) => {
    setShowDetailModal(true);
    try {
      const res = await apiFetch(`/api/${activeTab}/${id}`);
      const data = await res.json();
      setDetailData(data);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  /**
   * Obtiene de forma dinámica la tabla paginada de datos según la pestaña activa.
   */
  const cargarDatos = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'ventas') endpoint = `/api/ventas?page=${page}&limit=10&search=${search}&fecha=${fechaFiltro}`;
      if (activeTab === 'produccion') endpoint = `/api/produccion?page=${page}&limit=10&all=true&search=${search}`;
      if (activeTab === 'stock') endpoint = `/api/inventario?page=${page}&limit=12&search=${search}`;
      if (activeTab === 'compras') endpoint = `/api/compras?page=${page}&limit=10&search=${search}`;

      const res = await apiFetch(endpoint);
      const result = await res.json();
      
      setData(Array.isArray(result) ? result : (result.data || []));
      setTotalPages(result.meta?.last_page || result.lastPage || 1);
    } catch (err) {
      console.error(err);
      setData([]);
    }
    setLoading(false);
  };

  /**
   * Exporta la tabla de datos actual (filtrada) a un archivo de formato CSV.
   * Útil para abrir en Excel y realizar reportes contables.
   */
  const exportToCSV = async () => {
    try {
      const endpoint = `/api/ventas?all=true&search=${search}&fecha=${fechaFiltro}`;
      const res = await apiFetch(endpoint);
      const sales = await res.json();
      
      if (!Array.isArray(sales) || sales.length === 0) {
        Swal.fire('Sin registros', 'No hay ventas para exportar con los filtros actuales.', 'info');
        return;
      }
      
      const headers = ['ID Venta', 'Fecha', 'Hora', 'Cliente', 'Atendido por', 'Medio Pago', 'Total (S/)'];
      const csvRows = [headers.join(',')];
      
      sales.forEach(v => {
        const row = [
          v.id,
          new Date(v.fecha_venta).toLocaleDateString(),
          v.hora_venta,
          `"${(v.cliente_nombre || 'Cliente Genérico').replace(/"/g, '""')}"`,
          `"${(v.usuario_nombre || 'Sistema').replace(/"/g, '""')}"`,
          v.tipo_pago || 'Efectivo',
          Number(v.total).toFixed(2)
        ];
        csvRows.push(row.join(','));
      });
      
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Reporte_Ventas_${fechaFiltro || 'General'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exportando CSV:', err);
    }
  };

  /**
   * Genera un documento PDF/Print-friendly de la tabla actual,
   * abriendo una nueva ventana del navegador con estilos mínimos (CSS Inline) y 
   * mandando la orden de impresión automática de Windows/Mac.
   */
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const tableElement = document.querySelector('.data-table');
    if (!tableElement) return;
    const tableHTML = tableElement.outerHTML;
    
    let tabName = 'Ventas';
    if (activeTab === 'compras') tabName = 'Compras';
    if (activeTab === 'produccion') tabName = 'Producción';
    if (activeTab === 'stock') tabName = 'Inventario / Stock';

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de ${tabName} - El Rincón Panadero</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 25px; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; color: #8c4e07; }
            .header p { margin: 0; font-size: 13px; color: #666; }
            .filter-info { margin-bottom: 15px; font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .history-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-success { background: #dcfce7; color: #15803d; }
            .badge-warning { background: #fef3c7; color: #b45309; }
            .badge-danger { background: #fee2e2; color: #ef4444; }
            .badge-info { background: #e0f2fe; color: #0369a1; }
            .history-table-id { font-weight: bold; }
            /* Ocultar columna de acciones en impresión si existe */
            th:last-child, td:last-child { 
              ${activeTab === 'ventas' || activeTab === 'compras' ? 'display: none;' : ''} 
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>🥖 EL RINCÓN PANADERO 🥖</h1>
            <p>Reporte de ${tabName}</p>
          </div>
          <div class="filter-info">
            <strong>Fecha de Generación:</strong> ${new Date().toLocaleString()}<br/>
            ${activeTab === 'ventas' && fechaFiltro ? `<strong>Filtrado por Fecha:</strong> ${new Date(fechaFiltro).toLocaleDateString()}<br/>` : ''}
            ${search ? `<strong>Filtro de Búsqueda:</strong> "${search}"<br/>` : ''}
          </div>
          ${tableHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Historial General</h2>
          <p className="page-sub">Bitácora completa de movimientos de la panadería.</p>
        </div>
        
        <div className="history-tabs-container">
          <button 
            className={`history-tab-btn ${activeTab === 'ventas' ? 'active' : ''}`} 
            onClick={() => handleTabChange('ventas')}
          >
            <FaCartShopping /> VENTAS
          </button>
          <button 
            className={`history-tab-btn ${activeTab === 'compras' ? 'active' : ''}`} 
            onClick={() => handleTabChange('compras')}
          >
            <FaTruck /> COMPRAS
          </button>
          <button 
            className={`history-tab-btn ${activeTab === 'produccion' ? 'active' : ''}`} 
            onClick={() => handleTabChange('produccion')}
          >
            <FaFireBurner /> PRODUCCIÓN
          </button>
          <button 
            className={`history-tab-btn ${activeTab === 'stock' ? 'active' : ''}`} 
            onClick={() => handleTabChange('stock')}
          >
            <FaBoxesStacked /> STOCK
          </button>
        </div>
      </div>

      <div className="main-card">
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'ventas' && (
              <button 
                className="btn-new" 
                onClick={exportToCSV}
                style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', color: 'white', fontWeight: 'bold' }}
              >
                📥 Exportar Excel (CSV)
              </button>
            )}
            <button 
              className="btn-new" 
              onClick={printReport}
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', fontWeight: 'bold' }}
            >
              🖨️ Imprimir Reporte (PDF)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            {activeTab === 'ventas' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>Filtrar Fecha:</span>
                <input 
                  type="date" 
                  className="login-input" 
                  style={{ height: '40px', width: '165px', padding: '0 10px' }}
                  value={fechaFiltro}
                  onChange={(e) => {
                    setFechaFiltro(e.target.value);
                    setPage(1);
                  }}
                />
                {fechaFiltro && (
                  <button 
                    className="btn-edit" 
                    onClick={() => { setFechaFiltro(''); setPage(1); }} 
                    style={{ background: 'var(--text-muted)', color: 'white', height: '40px', padding: '0 12px' }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
            
            <div style={{ position: 'relative', width: '250px' }}>
              <input 
                type="text" 
                placeholder={`Buscar en ${activeTab}...`} 
                className="login-input" 
                style={{ paddingLeft: '10px', height: '40px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Cargando registros...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              {activeTab === 'ventas' && (
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha / Hora</th>
                    <th>Cliente</th>
                    <th>Atendido por</th>
                    <th style={{ textAlign: 'center' }}>Pago</th>
                    <th style={{ textAlign: 'right' }}>Total Pago</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
              )}
              {activeTab === 'compras' && (
                <thead>
                  <tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'center' }}>Estado</th><th style={{ textAlign: 'center' }}>Acciones</th></tr>
                </thead>
              )}
              {activeTab === 'produccion' && (
                <thead>
                  <tr><th>Fecha</th><th>Lote</th><th>Producto</th><th style={{ textAlign: 'center' }}>Cantidad</th><th style={{ textAlign: 'center' }}>Estado</th></tr>
                </thead>
              )}
              {activeTab === 'stock' && (
                <thead>
                  <tr><th>Fecha</th><th>Producto / Insumo</th><th>Movimiento</th><th style={{ textAlign: 'center' }}>Cantidad</th><th style={{ textAlign: 'right' }}>Stock Final</th></tr>
                </thead>
              )}
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No hay registros encontrados.</td></tr>
                )}
                {data.map((item, index) => (
                  <tr key={index}>
                    {activeTab === 'ventas' && (
                      <>
                        <td className="history-table-id">#{item.id}</td>
                        <td>
                          {new Date(item.fecha_venta).toLocaleDateString()}{' '}
                          <span style={{ color: 'var(--text-muted)' }}>
                            {item.hora_venta ? item.hora_venta.substring(0, 5) : ''}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.cliente_nombre || 'Cliente Genérico'}</td>
                        <td>{item.usuario_nombre || 'Sistema'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`history-badge ${
                            item.tipo_pago === 'Efectivo' ? 'badge-success' :
                            item.tipo_pago === 'Tarjeta' ? 'badge-info' :
                            item.tipo_pago === 'Yape' || item.tipo_pago === 'Plin' ? 'badge-warning' : 'badge-success'
                          }`}>
                            {item.tipo_pago || 'EFECTIVO'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                          S/ {Number(item.total || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-edit" style={{ background: '#3b82f6', color: 'white', padding: '5px 10px', borderRadius: '4px' }} onClick={() => verDetalle(item.id)} title="Ver Detalle">
                            <FaEye />
                          </button>
                        </td>
                      </>
                    )}
                    {activeTab === 'compras' && (
                      <>
                        <td className="history-table-id">#{item.id}</td>
                        <td>{new Date(item.fecha).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 800 }}>{item.proveedor || 'Sin Proveedor'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#ef4444' }}>S/ {Number(item.total).toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`history-badge ${item.estado === 'COMPLETADO' ? 'badge-success' : 'badge-warning'}`}>
                            {item.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-edit" style={{ background: '#3b82f6', color: 'white', padding: '5px 10px', borderRadius: '4px' }} onClick={() => verDetalle(item.id)} title="Ver Detalle">
                            <FaEye />
                          </button>
                        </td>
                      </>
                    )}
                    {activeTab === 'produccion' && (
                      <>
                        <td>{new Date(item.fecha).toLocaleDateString()}</td>
                        <td className="history-table-id">#{item.id}</td>
                        <td style={{ fontWeight: 800 }}>{item.producto_nombre}</td>
                        <td style={{ textAlign: 'center', fontWeight: 900 }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`history-badge ${item.estado === 'completado' ? 'badge-success' : 'badge-warning'}`}>
                            {item.estado === 'completado' ? 'HORNEADO' : 'PENDIENTE'}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === 'stock' && (
                      <>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(item.fecha).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 800 }}>{item.producto_nombre || 'Suministro'}</td>
                        <td>
                          <span className={`history-badge ${item.tipo_movimiento?.includes('SALIDA') ? 'badge-danger' : 'badge-success'}`}>
                            {item.tipo_movimiento?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: item.tipo_movimiento?.includes('SALIDA') ? '#ef4444' : '#10b981' }}>
                          {item.tipo_movimiento?.includes('SALIDA') ? '-' : '+'}{item.cantidad}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{item.stock_resultante}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">Página <strong>{page}</strong> de {totalPages}</div>
            <div className="pagination-buttons">
              <button className="btn-page" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}><FaChevronLeft /></button>
              <button className="btn-page active" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><FaChevronRight /></button>
            </div>
          </div>
        )}
      </div>
      {/* Modal de Detalle */}
      {showDetailModal && detailData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <h3>Detalle de {activeTab === 'ventas' ? 'Venta' : 'Compra'} #{detailData.id}</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="btn-new" style={{ padding: '5px 10px', fontSize: '0.8rem', height: 'auto' }} onClick={() => window.print()}>
                  🖨️ Imprimir / PDF
                </button>
                <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
              </div>
            </div>
            <div className="modal-body">
              {/* Diseño estilo Ticket de Supermercado */}
              <div style={{ 
                background: '#fff', 
                color: '#000', 
                fontFamily: 'monospace', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                maxWidth: '380px',
                margin: '10px auto',
                border: '1px solid #ddd'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', color: '#000' }}>🥖 EL RINCÓN PANADERO 🥖</h2>
                  <p style={{ margin: '0', fontSize: '11px' }}>RUC: 20123456789</p>
                  <p style={{ margin: '0', fontSize: '11px' }}>Av. Las Palmeras 123 - Lima</p>
                  <p style={{ margin: '0', fontSize: '11px' }}>Tel: (01) 456-7890</p>
                  <p style={{ margin: '5px 0' }}>----------------------------------------</p>
                  <p style={{ margin: '0', fontWeight: 'bold', fontSize: '12px' }}>TICKET DE VENTA #{detailData.id}</p>
                  <p style={{ margin: '0', fontSize: '11px' }}>Fecha: {new Date(detailData.fecha_venta || detailData.fecha).toLocaleString()}</p>
                  <p style={{ margin: '0', fontSize: '11px' }}>Cliente: {detailData.cliente_nombre ? `${detailData.cliente_nombre} ${detailData.cliente_apellido || ''}`.trim() : 'Cliente Genérico'}</p>
                  <p style={{ margin: '5px 0' }}>----------------------------------------</p>
                </div>
                
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px dashed #000', padding: '5px 0' }}>PROD</th>
                        <th style={{ textAlign: 'center', borderBottom: '1px dashed #000', padding: '5px 0' }}>CANT</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', padding: '5px 0' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailData.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'left', padding: '4px 0' }}>{item.nombre || item.producto_nombre || item.insumo_nombre}</td>
                          <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>S/ {Number(item.subtotal || (item.cantidad * (item.precio || item.precio_unitario))).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '5px 0' }}>----------------------------------------</p>
                  <p style={{ margin: '0', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>TOTAL: S/ {Number(detailData.total).toFixed(2)}</p>
                  <p style={{ margin: '5px 0' }}>----------------------------------------</p>
                  <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>¡Gracias por su compra!</p>
                  <p style={{ margin: '0', fontSize: '11px' }}>Vuelva pronto</p>
                </div>
              </div>
            
            {/* Ticket Oculto para Impresión (Estilo Supermercado) */}
            <div className="printable-ticket" style={{ display: 'none' }}>
              <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', color: '#000', padding: '20px' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>🥖 EL RINCÓN PANADERO 🥖</h2>
                <p style={{ margin: '0' }}>RUC: 20123456789</p>
                <p style={{ margin: '0' }}>Av. Principal 123 - Lima</p>
                <p style={{ margin: '0' }}>Tel: (01) 456-7890</p>
                <p style={{ margin: '5px 0' }}>--------------------------------</p>
                <p style={{ margin: '0', fontWeight: 'bold' }}>TICKET DE VENTA #{detailData.id}</p>
                <p style={{ margin: '0' }}>Fecha: {new Date(detailData.fecha_venta || detailData.fecha).toLocaleString()}</p>
                <p style={{ margin: '0' }}>Cliente: {detailData.cliente_nombre ? `${detailData.cliente_nombre} ${detailData.cliente_apellido || ''}`.trim() : 'Cliente Genérico'}</p>
                <p style={{ margin: '5px 0' }}>--------------------------------</p>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', borderBottom: '1px dashed #000' }}>Prod</th>
                      <th style={{ textAlign: 'center', borderBottom: '1px dashed #000' }}>Cant</th>
                      <th style={{ textAlign: 'right', borderBottom: '1px dashed #000' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailData.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left', padding: '2px 0' }}>{item.nombre || item.producto_nombre || item.insumo_nombre}</td>
                        <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>S/ {Number(item.subtotal || (item.cantidad * (item.precio || item.precio_unitario))).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <p style={{ margin: '5px 0' }}>--------------------------------</p>
                <p style={{ margin: '0', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>TOTAL: S/ {Number(detailData.total).toFixed(2)}</p>
                <p style={{ margin: '5px 0' }}>--------------------------------</p>
                <p style={{ margin: '10px 0 0 0', fontStyle: 'italic' }}>¡Gracias por su preferencia!</p>
                <p style={{ margin: '0' }}>Vuelva pronto</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
