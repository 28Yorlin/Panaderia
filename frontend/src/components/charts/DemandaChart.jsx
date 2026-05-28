import React from 'react';
import '../../assets/styles/prediccion.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

/**
 * Componente Gráfico de Demanda (DemandaChart)
 * 
 * Renderiza gráficos interactivos usando la librería Recharts.
 * Visualiza el Top de productos vendidos en los últimos 30 días (BarChart) 
 * y la tendencia mensual de ingresos (LineChart).
 * 
 * @param {{ topVentas?: { name: string; unidades: number }[]; ventasMensuales?: { mes: string; total: number }[] }} props
 */
export default function DemandaChart({ topVentas = [], ventasMensuales = [] }) {
  const ventas = Array.isArray(topVentas) ? topVentas : [];
  const mensual = Array.isArray(ventasMensuales) ? ventasMensuales : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div className="nova-kpi-card" style={{ padding: '1rem', minHeight: 280, textAlign: 'left' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase' }}>
          Productos más vendidos (30 días)
        </h3>
        {ventas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Sin datos de ventas aún. Registra ventas en el POS.</p>
        ) : (
          <ResponsiveContainer width="99%" height={240}>
            <BarChart data={ventas} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} uds`, 'Vendido']} />
              <Bar dataKey="unidades" fill="var(--brand-600)" radius={[4, 4, 0, 0]} name="Unidades" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="nova-kpi-card" style={{ padding: '1rem', minHeight: 260, textAlign: 'left' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase' }}>Ventas mensuales (6 meses)</h3>
        {mensual.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Sin histórico mensual.</p>
        ) : (
          <ResponsiveContainer width="99%" height={220}>
            <LineChart data={mensual} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v) => [`S/ ${Number(v).toFixed(2)}`, 'Total']} />
              <Line type="monotone" dataKey="total" stroke="var(--chart-green)" strokeWidth={2} dot name="Soles" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
