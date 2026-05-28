/**
 * Componente de Plantilla Principal (AppLayout)
 * 
 * Contenedor maestro que estructura la vista para usuarios logueados.
 * Integra la Barra Lateral de navegación (Sidebar), la Cabecera superior (Header)
 * y un contenedor dinámico donde se renderiza el contenido de cada página (<Outlet />).
 */
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';

export default function AppLayout() {
  const [sidebarMini, setSidebarMini] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  /**
   * Cambia manualmente el estado de la temática (Modo Claro / Modo Oscuro)
   */
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.body.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
  }, []);

  return (
    <div className={`app-container ${sidebarMini ? 'sidebar-mini' : ''}`}>
      <Sidebar mini={sidebarMini} onItemClick={() => setSidebarMini(false)} />
      <div className="main-content">
        <Header 
          onToggleSidebar={() => setSidebarMini(!sidebarMini)} 
          onToggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
