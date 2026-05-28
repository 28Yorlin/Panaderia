/**
 * Componente de Carga Global (Loader)
 * 
 * Muestra un indicador visual (spinner) durante las transiciones 
 * de red o validaciones de sesión (AuthContext).
 */
import React from 'react';
import '../../assets/styles/loader.css';

export default function Loader() {
  return (
    <div className="loader-wrap" role="status" aria-label="Cargando">
      <div className="loader-ring" />
      <p className="loader-text">Cargando sesión…</p>
    </div>
  );
}
