/**
 * Componente de Punto de Venta (POS - Ventas)
 * 
 * Interfaz principal para la atención al público. Permite:
 * 1. Buscar y seleccionar productos del catálogo.
 * 2. Gestionar un carrito de compras interactivo.
 * 3. Buscar clientes existentes o registrar nuevos mediante un modal.
 * 4. Procesar la venta final (Boleta/Factura) afectando el inventario en tiempo real.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { API_BASE } from '../services/api';
import { FaCartShopping, FaMagnifyingGlass, FaTrashCan, FaCircleCheck, FaBreadSlice, FaPlus } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/ventas.css';

export default function Ventas() {
  // Estados base de inventario y carrito
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  
  // Estados transaccionales para procesar el pago final
  const [idCliente, setIdCliente] = useState('');
  const [tipoPago, setTipoPago] = useState('Efectivo');
  const [tipoComprobante, setTipoComprobante] = useState('Boleta');
  const [montoPagar, setMontoPagar] = useState('');
  const [vuelto, setVuelto] = useState(0);

  // Búsqueda de clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarDropdownCliente, setMostrarDropdownCliente] = useState(false);

  // Paginación de productos
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda]);

  // Estado para el modal de nuevo cliente
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [formDataCliente, setFormDataCliente] = useState({
    nombre: '', apellido: '', dni: '', ruc: '', razon_social: '',
    telefono: '', correo: '', direccion: ''
  });

  useEffect(() => {
    // Cargar productos
    apiFetch('/api/productos?all=true')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProductos(data);
        } else {
          setProductos([]);
          console.error("Backend did not return an array for products:", data);
        }
      })
      .catch(console.error);

    // Cargar clientes
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    apiFetch('/api/clientes?all=true')
      .then(r => r.json())
      .then(data => setClientes(data.data || []))
      .catch(console.error);
  };

  useEffect(() => {
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const pago = parseFloat(montoPagar) || 0;
    setVuelto(pago > total ? pago - total : 0);
  }, [montoPagar, carrito]);

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  /**
   * Envía el carrito y los datos de pago al Backend para crear la transacción.
   * Ejecuta la limpieza de la pantalla de ventas tras el éxito.
   */
  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    try {
      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify({
          total,
          id_cliente: idCliente || null,
          tipo_pago: tipoPago,
          tipo_comprobante: tipoComprobante,
          items: carrito.map(i => ({ id: i.id, cantidad: i.cantidad, precio: i.precio }))
        })
      });
      if (res.ok) {
        Swal.fire('¡Venta Exitosa!', `La venta ha sido registrada como ${tipoComprobante}.`, 'success');
        setCarrito([]);
        setIdCliente('');
        setBusquedaCliente('');
        setMontoPagar('');
        setVuelto(0);
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo procesar la venta.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo procesar la venta.', 'error');
    }
  };

  const handleSaveCliente = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(formDataCliente)
      });
      if (res.ok) {
        const data = await res.json();
        Swal.fire('Guardado', 'Cliente registrado correctamente.', 'success');
        setShowModalCliente(false);
        setFormDataCliente({
          nombre: '', apellido: '', dni: '', ruc: '', razon_social: '',
          telefono: '', correo: '', direccion: ''
        });
        cargarClientes();
        if (data.id) {
          setIdCliente(data.id);
          setBusquedaCliente(`${formDataCliente.nombre} ${formDataCliente.apellido || ''}`);
        }
      } else {
        const errData = await res.json();
        Swal.fire('Error', errData.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) { console.error(err); }
  };

  const filtered = Array.isArray(productos) ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())) : [];
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const clientesFiltrados = clientes.filter(c => {
    const search = busquedaCliente.toLowerCase();
    const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
    return (
      nombreCompleto.includes(search) ||
      (c.dni && c.dni.includes(search)) ||
      (c.ruc && c.ruc.includes(search))
    );
  });

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Punto de Venta</h2>
          <p className="page-sub">Registra tus ventas de forma rápida y sencilla.</p>
        </div>
        <button 
          className="btn-new" 
          onClick={() => {
            if (carrito.length > 0) {
              Swal.fire({
                title: '¿Reiniciar Venta?',
                text: "Se borrarán los productos del carrito actual.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, reiniciar',
                cancelButtonText: 'Cancelar'
              }).then((result) => {
                if (result.isConfirmed) {
                  setCarrito([]);
                  setIdCliente('');
                  setBusquedaCliente('');
                  setMontoPagar('');
                  setVuelto(0);
                  Swal.fire('¡Listo!', 'Venta reiniciada.', 'success');
                }
              });
            } else {
              setCarrito([]);
              setIdCliente('');
              setBusquedaCliente('');
              setMontoPagar('');
              setVuelto(0);
              Swal.fire('¡Listo!', 'Venta lista.', 'success');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaPlus /> NUEVA VENTA
        </button>
      </div>
      <div className="pos-container">
        
        {/* Catálogo */}
        <section className="catalog-section">
          <div className="search-bar-pos">
            <FaMagnifyingGlass className="pos-icon-muted" />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre..." 
              className="search-input-pos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="products-grid-pos">
            {paginatedProducts.map(p => (
              <div key={p.id} className="product-card-pos" onClick={() => agregarAlCarrito(p)}>
                <div className="pos-product-icon">
                  {p.imagen
                    ? <img
                        src={`${API_BASE}/uploads/productos/${p.imagen}`}
                        alt={p.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    : null
                  }
                  <FaBreadSlice style={{ display: p.imagen ? 'none' : 'block' }} />
                </div>
                <div className="pos-product-name">{p.nombre}</div>
                <div className="pos-product-price">S/ {Number(p.precio || 0).toFixed(2)}</div>
                <div className="pos-product-stock">Stock: {p.stock_actual}</div>
              </div>
            ))}
            {paginatedProducts.length === 0 && (
              <div className="pos-empty-cart" style={{ gridColumn: '1/-1' }}>
                <p>No se encontraron productos.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container" style={{ marginTop: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '10px 15px' }}>
              <div className="pagination-info">
                Pág. <strong>{currentPage}</strong> de {totalPages} ({filtered.length} prod.)
              </div>
              <div className="pagination-buttons">
                <button 
                  className="btn-page" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  Ant.
                </button>
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`btn-page ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: '30px' }}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="btn-page" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  Sig.
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Carrito e Información de Pago */}
        <aside className="cart-section">
          <div className="cart-header">
            <h3 className="pos-cart-title" style={{ margin: 0, color: 'white' }}><FaCartShopping /> NUEVA VENTA</h3>
            <span className="pos-cart-badge">
              {carrito.length} items
            </span>
          </div>

          {/* Información del Comprobante */}
          <div className="pos-client-info-box">
            <div className="pos-form-group">
              <label className="pos-label-mini">Tipo de Comprobante</label>
              <select className="login-input pos-input-mini" value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)}>
                <option value="Boleta">Boleta</option>
                <option value="Factura">Factura</option>
                <option value="Ticket">Ticket</option>
              </select>
            </div>
            <div className="pos-form-group">
              <label className="pos-label-mini">Tipo de Pago</label>
              <select className="login-input pos-input-mini" value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
              </select>
            </div>

            {/* Buscador de Clientes Inteligente */}
            <div className="pos-flex-end">
              <div className="pos-relative-flex">
                <label className="pos-label-mini">Cliente</label>
                <input 
                  type="text" 
                  className="login-input pos-input-mini" 
                  placeholder="Buscar por Nombre, DNI o RUC..." 
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarDropdownCliente(true);
                    if (e.target.value === '') setIdCliente('');
                  }}
                  onBlur={() => setTimeout(() => setMostrarDropdownCliente(false), 200)}
                  onFocus={() => setMostrarDropdownCliente(true)}
                />
                
                {/* Dropdown de Resultados */}
                {mostrarDropdownCliente && busquedaCliente && clientesFiltrados.length > 0 && (
                  <div className="pos-search-results">
                    {clientesFiltrados.map(c => (
                      <div 
                        key={c.id} 
                        className="pos-search-item"
                        onClick={() => { 
                          setIdCliente(c.id); 
                          setBusquedaCliente(`${c.nombre} ${c.apellido || ''}`); 
                          setMostrarDropdownCliente(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <div className="pos-search-item-name">{c.nombre} {c.apellido || ''}</div>
                        <div className="pos-search-item-sub">DNI: {c.dni || 'N/A'} | RUC: {c.ruc || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-new" onClick={() => setShowModalCliente(true)} style={{ height: '35px', padding: '0 15px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                + Cliente
              </button>
            </div>
          </div>

          {/* Lista de Items */}
          <div className="cart-items-list">
            {carrito.length === 0 && (
              <div className="pos-empty-cart">
                <FaCartShopping className="pos-empty-icon" />
                <p>El carrito está vacío</p>
              </div>
            )}
            {carrito.map(item => (
              <div key={item.id} className="cart-item">
                <div>
                  <div className="pos-item-name">{item.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                    <button 
                      onClick={() => {
                        if (item.cantidad > 1) {
                          setCarrito(carrito.map(i => i.id === item.id ? { ...i, cantidad: i.cantidad - 1 } : i));
                        } else {
                          setCarrito(carrito.filter(i => i.id !== item.id));
                        }
                      }}
                      style={{ padding: '0px 8px', fontSize: '1rem', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                    <button 
                      onClick={() => setCarrito(carrito.map(i => i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i))}
                      style={{ padding: '0px 8px', fontSize: '1rem', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      +
                    </button>
                    <span className="pos-item-sub" style={{ marginLeft: '5px' }}>x S/ {Number(item.precio).toFixed(2)}</span>
                  </div>
                </div>
                <div className="pos-item-total">S/ {(item.cantidad * item.precio).toFixed(2)}</div>
                <button 
                  onClick={() => setCarrito(carrito.filter(i => i.id !== item.id))}
                  className="pos-btn-delete-item"
                >
                  <FaTrashCan />
                </button>
              </div>
            ))}
          </div>

          {/* Footer de Pago */}
          <div className="cart-footer">
            <div className="total-row">
              <span className="pos-total-label">TOTAL</span>
              <span className="pos-total-amount">S/ {total.toFixed(2)}</span>
            </div>

            <div className="pos-pay-grid">
              <div className="pos-flex-1">
                <label className="pos-label-mini">Monto a Pagar</label>
                <input type="number" className="login-input pos-input-mini" value={montoPagar} onChange={(e) => setMontoPagar(e.target.value)} placeholder="0.00" />
              </div>
              <div className="pos-flex-1">
                <label className="pos-label-mini">Vuelto</label>
                <input type="text" className="login-input pos-input-mini" style={{ background: 'var(--bg-app)' }} value={`S/ ${vuelto.toFixed(2)}`} readOnly />
              </div>
            </div>

            <button className="btn-checkout" onClick={finalizarVenta} disabled={carrito.length === 0}>
              <FaCircleCheck /> REGISTRAR VENTA
            </button>
          </div>
        </aside>

      </div>

      {/* Modal Agregar Nuevo Cliente */}
      {showModalCliente && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Agregar Nuevo Cliente</h3>
              <button className="btn-close" onClick={() => setShowModalCliente(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCliente} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Juan" value={formDataCliente.nombre} onChange={(e) => setFormDataCliente({...formDataCliente, nombre: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Apellido</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Silva" value={formDataCliente.apellido} onChange={(e) => setFormDataCliente({...formDataCliente, apellido: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DNI</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 71234567 (8 dígitos)" value={formDataCliente.dni} onChange={(e) => setFormDataCliente({...formDataCliente, dni: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RUC</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 20123456789 (11 dígitos)" value={formDataCliente.ruc} onChange={(e) => setFormDataCliente({...formDataCliente, ruc: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Razón Social</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Panadería El Rincón S.A.C." value={formDataCliente.razon_social} onChange={(e) => setFormDataCliente({...formDataCliente, razon_social: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Teléfono</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: 987654321" value={formDataCliente.telefono} onChange={(e) => setFormDataCliente({...formDataCliente, telefono: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correo</label>
                  <input type="email" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: cliente@correo.com" value={formDataCliente.correo} onChange={(e) => setFormDataCliente({...formDataCliente, correo: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dirección</label>
                <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Ej: Av. Las Palmeras 123 - Lima" value={formDataCliente.direccion} onChange={(e) => setFormDataCliente({...formDataCliente, direccion: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  style={{ 
                    background: '#64748b', 
                    color: 'white', 
                    border: 'none', 
                    height: '40px', 
                    padding: '0 20px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => setShowModalCliente(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    height: '40px', 
                    padding: '0 20px', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
