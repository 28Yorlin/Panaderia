/**
 * Componente Cabecera (Header)
 * 
 * Barra superior de navegación que contiene el botón para colapsar
 * el menú lateral, el selector de Modo Claro/Oscuro y el menú 
 * desplegable de usuario (logout).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRightFromBracket, FaBars, FaSun, FaMoon, FaBell } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/http';
import '../../assets/styles/layout.css';

export default function Header({ onToggleSidebar, onToggleDarkMode, darkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button className="btn-toggle-sidebar" onClick={onToggleSidebar} title="Colapsar menú">
          <FaBars />
        </button>
        <div className="header-title">
          Rincón Panadero — <span style={{ color: 'var(--primary)' }}>ERP</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>


        {/* Botón de Modo Oscuro */}
        <button
          className="btn-toggle-sidebar"
          onClick={() => { console.log('Click en botón Header'); onToggleDarkMode(); }}
          title={darkMode ? "Modo Claro" : "Modo Oscuro"}
          style={{ fontSize: '1.2rem' }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          {user?.nombre || 'Administrador'}
        </div>

        <button
          onClick={handleLogout}
          className="btn-logout-header"
          title="Cerrar Sesión"
        >
          <FaRightFromBracket />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}
