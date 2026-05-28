import React, { useState } from 'react';
export default function VentaForm({ onSubmit }) {
  const [form, setForm] = useState({ producto_id: '', cantidad: 1, precio: 0 });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  return <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem' }}>
    <input placeholder="Producto ID" value={form.producto_id} 
           onChange={e => setForm({...form, producto_id: e.target.value})} required />
    <input type="number" placeholder="Cantidad" value={form.cantidad} 
           onChange={e => setForm({...form, cantidad: e.target.value})} required />
    <input type="number" placeholder="Precio" value={form.precio} 
           onChange={e => setForm({...form, precio: e.target.value})} required />
    <button type="submit">Registrar</button>
  </form>;
}