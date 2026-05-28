/**
 * Componente Barra Lateral (Sidebar)
 * 
 * Menú principal de navegación. Genera dinámicamente los enlaces
 * dependiendo de los Permisos y Rol del Usuario (RBAC) inyectados desde
 * el AuthContext. Soporta colapsado y modo responsivo.
 */
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaHouse, FaBox, FaCartShopping, FaClockRotateLeft,
  FaWheatAwn, FaTrashCan, FaUserGroup, FaBrain,
  FaKitchenSet, FaChartPie, FaGear, FaStore,
  FaChevronDown, FaChevronRight, FaTags, FaUserShield,
  FaMoneyBillTransfer
} from 'react-icons/fa6';
import '../../assets/styles/layout.css';

export default function Sidebar({ mini, onItemClick }) {
  const { user } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (title) => {
    if (mini) return;
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleItemClick = () => {
    if (window.innerWidth < 768 && onItemClick) {
      onItemClick();
    }
  };

  const menuGroups = [
    {
      title: 'PRINCIPAL',
      roles: [1, 2, 3],
      items: [
        { path: '/', label: 'Dashboard', icon: <FaHouse /> },
      ]
    },
    {
      title: 'VENTAS',
      roles: [1, 3],
      items: [
        { path: '/ventas', label: 'Punto de Venta', icon: <FaCartShopping /> },
        { path: '/historial', label: 'Historial General', icon: <FaClockRotateLeft /> },
        { path: '/clientes', label: 'Clientes', icon: <FaUserGroup /> },
      ]
    },
    {
      title: 'PRODUCCIÓN',
      roles: [1, 2],
      items: [
        { path: '/produccion', label: 'Producción Diaria', icon: <FaKitchenSet /> },
        { path: '/lotes', label: 'Lotes de Producción', icon: <FaBox /> },
        { path: '/prediccion', label: 'Predicción', icon: <FaBrain /> },
        { path: '/mermas', label: 'Mermas', icon: <FaTrashCan /> },
      ]
    },
    {
      title: 'INVENTARIO',
      roles: [1, 2],
      items: [
        { path: '/productos', label: 'Productos', icon: <FaBox /> },
        { path: '/categorias', label: 'Categorías', icon: <FaTags /> },
        { path: '/stock', label: 'Stock', icon: <FaStore /> },
        { path: '/kardex', label: 'Kárdex', icon: <FaBox /> },
        { path: '/insumos', label: 'Insumos', icon: <FaWheatAwn /> },
        { path: '/recetas', label: 'Recetas', icon: <FaKitchenSet /> },
        { path: '/proveedores', label: 'Proveedores', icon: <FaStore /> },
      ]
    },
    {
      title: 'COMPRAS',
      roles: [1, 2],
      items: [
        { path: '/compras', label: 'Compras', icon: <FaCartShopping /> },
      ]
    },
    {
      title: 'FINANZAS',
      roles: [1],
      items: [
        { path: '/cajachica', label: 'Caja Chica', icon: <FaStore /> },
        { path: '/gastos', label: 'Gastos', icon: <FaChartPie /> },
        { path: '/pagos', label: 'Control de Pagos', icon: <FaMoneyBillTransfer /> },
        { path: '/reportes', label: 'Reportes BI', icon: <FaChartPie /> },
      ]
    },
    {
      title: 'ADMINISTRACIÓN',
      roles: [1],
      items: [
        { path: '/usuarios', label: 'Usuarios', icon: <FaUserGroup /> },
        { path: '/roles', label: 'Roles', icon: <FaUserShield /> },
        { path: '/configuracion', label: 'Configuración', icon: <FaGear /> },
        { path: '/auditoria', label: 'Auditoría', icon: <FaClockRotateLeft /> },
      ]
    }
  ];

  return (
    <aside className={`sidebar ${mini ? 'mini' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-box">
          <FaStore className="logo-icon" title="Rincón Panadero" />
          <div>
            <div className="logo-text">Rincón Panadero</div>
            <div className="logo-sub">Sistema de Gestión</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuGroups.map((group, idx) => {
          if (user && user.permisos) {
            try {
              const allowed = JSON.parse(user.permisos);
              if (!allowed.includes(group.title)) return null;
            } catch (e) {
              console.error('Error parsing permisos:', e);
              if (!group.roles.includes(user.id_rol)) return null;
            }
          } else if (user && !group.roles.includes(user.id_rol)) {
            return null;
          }
          const isCollapsed = collapsedGroups[group.title];
          return (
            <div key={idx} className={`sidebar-group ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="sidebar-group-header" onClick={() => toggleGroup(group.title)}>
                <span className="sidebar-group-title">{group.title}</span>
                {isCollapsed ? <FaChevronRight className="arrow-icon" /> : <FaChevronDown className="arrow-icon" />}
              </div>

              <div className="sidebar-group-items">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title={mini ? item.label : ""}
                    onClick={handleItemClick}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
