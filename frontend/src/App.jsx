/**
 * Enrutador Principal de la Aplicación (App.jsx)
 * 
 * Declara las rutas base del Frontend. Protege las rutas internas
 * mediante `PrivateRoute` y las envuelve en `AppLayout` para mostrar
 * la barra lateral (Sidebar) y el encabezado (Header).
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import CommandPalette from './components/common/CommandPalette';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Prediccion from './pages/Prediccion';
import Produccion from './pages/Produccion';
import Insumos from './pages/Insumos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Clientes from './pages/Clientes';
import Usuarios from './pages/Usuarios';
import Mermas from './pages/Mermas';
import Historial from './pages/Historial';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import CajaChica from './pages/CajaChica';
import Categorias from './pages/Categorias';
import Recetas from './pages/Recetas';
import Roles from './pages/Roles';
import Auditoria from './pages/Auditoria';
import Gastos from './pages/Gastos';
import Lotes from './pages/Lotes';
import Stock from './pages/Stock';
import Pagos from './pages/Pagos';
import Kardex from './pages/Kardex';

export default function App() {
  return (
    <BrowserRouter>
      <CommandPalette />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/historial" element={<Historial />} />

            <Route path="/prediccion" element={<Prediccion />} />
            <Route path="/produccion" element={<Produccion />} />
            <Route path="/insumos" element={<Insumos />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/mermas" element={<Mermas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/cajachica" element={<CajaChica />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/auditoria" element={<Auditoria />} />
            <Route path="/pagos" element={<Pagos />} />
            
            <Route path="/lotes" element={<Lotes />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/kardex" element={<Kardex />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
