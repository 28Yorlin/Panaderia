/**
 * Componente de Compras
 * 
 * Interfaz administrativa que simula un "Punto de Compra" inverso.
 * El usuario puede añadir insumos a un carrito, ajustar costos y 
 * asentar la compra, lo cual aumenta automáticamente el inventario físico.
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaCartShopping, FaTrashCan, FaCircleCheck, FaPlus } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/compras.css'; 

export default function Compras() {
  const [insumos, setInsumos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [idProveedor, setIdProveedor] = useState('');
  
  // Estados para el formulario de agregar item
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadToAdd, setCantidadToAdd] = useState(1);
  const [precioToAdd, setPrecioToAdd] = useState(0);

  useEffect(() => {
    // Cargar insumos
    apiFetch('/api/insumos?all=true')
      .then(r => r.json())
      .then(data => setInsumos(Array.isArray(data) ? data : []))
      .catch(console.error);

    // Cargar proveedores
    apiFetch('/api/proveedores?all=true')
      .then(r => r.json())
      .then(data => setProveedores(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  /**
   * Añade el insumo seleccionado al carrito de compra.
   * Si ya existe, suma la cantidad; si no, lo registra con su precio estimado.
   */
  const handleAddInsumo = () => {
    if (!selectedInsumoId) return;
    const insumo = insumos.find(i => i.id === parseInt(selectedInsumoId));
    if (!insumo) return;

    const existe = carrito.find(item => item.id === insumo.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === insumo.id ? { ...item, cantidad: item.cantidad + parseFloat(cantidadToAdd) } : item));
    } else {
      setCarrito([...carrito, { 
        ...insumo, 
        cantidad: parseFloat(cantidadToAdd), 
        precio_unitario: parseFloat(precioToAdd) || insumo.costo_unitario || 0 
      }]);
    }
    // Resetear inputs
    setSelectedInsumoId('');
    setCantidadToAdd(1);
    setPrecioToAdd(0);
  };

  const actualizarPrecio = (id, precio) => {
    setCarrito(carrito.map(item => item.id === id ? { ...item, precio_unitario: parseFloat(precio) } : item));
  };

  const actualizarCantidad = (id, cant) => {
    setCarrito(carrito.map(item => item.id === id ? { ...item, cantidad: parseFloat(cant) } : item));
  };

  const subtotal = carrito.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);
  const igv = subtotal * 0.18; 
  const total = subtotal + igv;

  /**
   * Envía la orden completa al Backend para ser registrada.
   * Modificará el stock en tabla insumos e insertará los movimientos.
   */
  const finalizarCompra = async () => {
    if (carrito.length === 0) return;
    try {
      const res = await apiFetch('/api/compras', {
        method: 'POST',
        body: JSON.stringify({
          total: total, // Enviamos el total con IGV
          proveedor_id: idProveedor || null,
          items: carrito.map(i => ({ id_insumo: i.id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
        })
      });
      if (res.ok) {
        Swal.fire('¡Compra Exitosa!', 'La compra ha sido registrada.', 'success');
        setCarrito([]);
        setIdProveedor('');
      } else {
        Swal.fire('Error', 'No se pudo procesar la compra.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo procesar la compra.', 'error');
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Nueva compra</h2>
          <p className="page-sub">Registra tus compras de insumos a proveedores.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Lado Izquierdo: Buscador y Tabla */}
        <div>
          <div className="main-card" style={{ padding: '20px' }}>
            
            {/* Formulario para agregar items (Estilo Referencia) */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Buscar insumo</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={selectedInsumoId}
                  onChange={(e) => {
                    setSelectedInsumoId(e.target.value);
                    const insumo = insumos.find(i => i.id === parseInt(e.target.value));
                    if (insumo) setPrecioToAdd(insumo.costo_unitario || 0);
                  }}
                >
                  <option value="">Seleccionar insumo...</option>
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cantidad</label>
                <input 
                  type="number" 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={cantidadToAdd}
                  onChange={(e) => setCantidadToAdd(e.target.value)}
                  min="1"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Costo Unit.</label>
                <input 
                  type="number" 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={precioToAdd}
                  onChange={(e) => setPrecioToAdd(e.target.value)}
                />
              </div>
              <button className="btn-new" onClick={handleAddInsumo} style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <FaPlus />
              </button>
            </div>

            {/* Tabla de Items (Estilo Referencia) */}
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px' }}>N°</th>
                  <th style={{ padding: '12px' }}>Insumo</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Costo Unit.</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{index + 1}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700 }}>{item.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unidad_medida}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input 
                        type="number" 
                        className="login-input" 
                        style={{ height: '30px', width: '60px', textAlign: 'center' }} 
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.id, e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <input 
                        type="number" 
                        className="login-input" 
                        style={{ height: '30px', width: '80px', textAlign: 'right' }} 
                        value={item.precio_unitario}
                        onChange={(e) => actualizarPrecio(item.id, e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setCarrito(carrito.filter(i => i.id !== item.id))}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <FaTrashCan />
                      </button>
                    </td>
                  </tr>
                ))}
                {carrito.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay insumos agregados a la compra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totales (Estilo Referencia) */}
            {carrito.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Sub Total</span>
                    <span style={{ fontWeight: 700 }}>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>IGV (18%)</span>
                    <span style={{ fontWeight: 700 }}>S/ {igv.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--brand-700)', color: 'white', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                    <span style={{ fontWeight: 800 }}>Total</span>
                    <span style={{ fontWeight: 900 }}>S/ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Información del Proveedor (Estilo Referencia) */}
        <div>
          <div className="main-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}>Información del Proveedor</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo de compra</label>
                <select className="login-input" style={{ paddingLeft: '10px', height: '40px' }}>
                  <option>Factura</option>
                  <option>Boleta</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo de pago</label>
                <select className="login-input" style={{ paddingLeft: '10px', height: '40px' }}>
                  <option>Efectivo</option>
                  <option>Transferencia Bancaria</option>
                  <option>Yape</option>
                  <option>Plin</option>
                  <option>Tarjeta de Débito</option>
                  <option>Tarjeta de Crédito</option>
                  <option>Al Crédito (Por pagar)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input 
                  type="text" 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px', background: 'var(--bg-light)' }}
                  value={new Date().toLocaleString()}
                  disabled
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seleccionar proveedor</label>
                <select 
                  className="login-input" 
                  style={{ paddingLeft: '10px', height: '40px' }}
                  value={idProveedor}
                  onChange={(e) => setIdProveedor(e.target.value)}
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>N° Compra</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="N° ......" />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Observación</label>
                  <input type="text" className="login-input" style={{ paddingLeft: '10px', height: '40px' }} placeholder="Observación" />
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn-checkout" 
                  onClick={finalizarCompra} 
                  disabled={carrito.length === 0}
                  style={{ width: 'auto', padding: '0 30px', height: '40px' }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
