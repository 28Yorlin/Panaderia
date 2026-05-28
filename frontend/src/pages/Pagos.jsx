/**
 * Componente Módulo de Pagos
 * 
 * Interfaz de solo lectura para auditar los ingresos recibidos por ventas,
 * clasificando el método de pago utilizado (Efectivo, Transferencia, Yape, Plin).
 */
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/http';
import { FaMoneyBillTransfer, FaEye, FaReceipt } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/pagos.css';
import DataGridPremium from '../components/common/DataGridPremium';

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    cargarPagos();
  }, [page, search]);

  /**
   * Obtiene la tabla de pagos paginada.
   */
  const cargarPagos = () => {
    apiFetch(`/api/pagos?page=${page}&limit=10&search=${search}`)
      .then(r => r.json())
      .then(data => {
        setPagos(data.data || []);
        setTotalPages(data.meta?.last_page || 1);
        setTotalRecords(data.meta?.total || 0);
      })
      .catch(err => {
        console.error(err);
        setPagos([]);
      });
  };

  return (
    <div className="main-wrapper">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Módulo de Pagos</h2>
          <p className="page-sub">Registro y control de pagos recibidos por ventas.</p>
        </div>
      </div>

      <div className="main-card">
        <DataGridPremium
          columns={[
            { key: 'id', label: 'ID Pago', render: (p) => `#${p.id}` },
            { key: 'fecha', label: 'Fecha', render: (p) => new Date(p.fecha).toLocaleString() },
            { key: 'venta_id', label: 'ID Venta', render: (p) => `#${p.venta_id}` },
            { key: 'cliente_nombre', label: 'Cliente', render: (p) => p.cliente_nombre || 'General' },
            { 
              key: 'metodo_pago', 
              label: 'Método', 
              render: (p) => (
                <span className={`history-badge ${
                  p.metodo_pago?.toUpperCase() === 'EFECTIVO' ? 'badge-success' : 
                  p.metodo_pago?.toUpperCase() === 'TRANSFERENCIA' ? 'badge-warning' : 
                  p.metodo_pago?.toUpperCase() === 'YAPE' ? 'badge-info' : 
                  p.metodo_pago?.toUpperCase() === 'PLIN' ? 'badge-primary' : 'badge-danger'
                }`}>
                  {p.metodo_pago}
                </span>
              )
            },
            { key: 'monto', label: 'Monto', render: (p) => `S/ ${Number(p.monto).toFixed(2)}` }
          ]}
          data={pagos}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </div>
    </div>
  );
}
