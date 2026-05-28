/**
 * Componente de Configuración Global
 * 
 * Permite administrar las preferencias de la cuenta, datos fiscales del negocio
 * y controlar manualmente el motor de Inteligencia Artificial (reentrenamiento de modelo).
 */
import React, { useState } from 'react';
import { FaUserAstronaut, FaBuilding, FaRobot, FaShieldHalved, FaPalette } from 'react-icons/fa6';
import { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import '../assets/styles/configuracion.css';

export default function Configuracion() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [training, setTraining] = useState(false);

  /**
   * Fuerza la ejecución del pipeline de entrenamiento del modelo de Machine Learning en Python.
   * Invoca el endpoint del backend que se comunica con la API Flask.
   */
  const handleRetrain = async () => {
    const result = await Swal.fire({
      title: 'Reentrenar Modelo IA',
      text: '¿Deseas iniciar el reentrenamiento del bosque aleatorio con los últimos datos de mermas y ventas de la base de datos?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Iniciar Proceso',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--text-muted)'
    });

    if (!result.isConfirmed) return;

    setTraining(true);
    Swal.fire({
      title: 'Entrenando...',
      text: 'El motor de IA está procesando los datos de la base de datos. Por favor espera.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/prediccion/entrenar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        Swal.fire('¡Éxito!', data.mensaje || 'Modelo actualizado correctamente.', 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo completar el reentrenamiento.', 'error');
      }
    } catch (err) {
      Swal.fire('Error de Conexión', 'No se pudo contactar con el servidor.', 'error');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="main-wrapper config-container">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Configuración General</h2>
          <p className="page-sub">Ajustes del sistema, preferencias y administración del motor de Machine Learning.</p>
        </div>
      </div>

      <div className="config-grid">

        {/* Sidebar de Configuración */}
        <div className="main-card config-sidebar">
          <ul className="config-nav-list">
            <li>
              <button
                onClick={() => setActiveTab('perfil')}
                className={`config-nav-btn ${activeTab === 'perfil' ? 'active' : ''}`}
              >
                <FaUserAstronaut /> Mi Perfil
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('negocio')}
                className={`config-nav-btn ${activeTab === 'negocio' ? 'active' : ''}`}
              >
                <FaBuilding /> Datos del Negocio
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('ia')}
                className={`config-nav-btn ${activeTab === 'ia' ? 'active' : ''}`}
              >
                <FaRobot /> Motor de IA
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('seguridad')}
                className={`config-nav-btn ${activeTab === 'seguridad' ? 'active' : ''}`}
              >
                <FaShieldHalved /> Seguridad & API
              </button>
            </li>
          </ul>
        </div>

        {/* Contenido Principal */}
        <div className="main-card config-content-box">

          {activeTab === 'perfil' && (
            <div className="fade-in" style={{ padding: '24px' }}>
              <h3 className="card-title config-title-flex">
                <FaUserAstronaut style={{ color: '#3b82f6' }} /> Información de Cuenta
              </h3>
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre de Usuario</label>
                  <input type="text" defaultValue={user?.nombre} readOnly className="login-input config-input-readonly" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                  <input type="email" defaultValue={user?.email} readOnly className="login-input config-input-readonly" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rol de Sistema</label>
                  <input type="text" defaultValue={`ID Rol: ${user?.id_rol}`} readOnly className="login-input config-input-readonly" />
                </div>
              </div>
              <button className="btn-new config-margin-top-15">Actualizar Contraseña</button>
            </div>
          )}

          {activeTab === 'negocio' && (
            <div className="fade-in" style={{ padding: '24px' }}>
              <h3 className="card-title config-title-flex">
                <FaBuilding style={{ color: '#3b82f6' }} /> Parámetros de Rincón Panadero
              </h3>
              <div className="form-grid-2-insumos">
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Razón Social</label>
                  <input type="text" defaultValue="Rincón Panadero S.A.C." className="login-input" style={{ paddingLeft: '10px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RUC / NIT</label>
                  <input type="text" defaultValue="20123456789" className="login-input" style={{ paddingLeft: '10px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Moneda Principal</label>
                  <select className="login-input" style={{ paddingLeft: '10px' }}>
                    <option>Soles (S/)</option>
                    <option>Dólares ($)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Mínimo Global de Alerta</label>
                  <input type="number" defaultValue="10" className="login-input" style={{ paddingLeft: '10px' }} />
                </div>
              </div>
              <button className="btn-new config-margin-top-15">Guardar Cambios</button>
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="fade-in" style={{ padding: '24px' }}>
              <h3 className="card-title config-title-flex">
                <FaRobot style={{ color: '#10b981' }} /> Motor de Predicción (Random Forest)
              </h3>
              <p className="config-text-muted">
                El modelo de Machine Learning aprende de las ventas históricas y las mermas registradas.
                Se recomienda reentrenar el modelo al menos 1 vez por mes para adaptar las predicciones a nuevas tendencias o cambios de clima.
              </p>

              <div className="config-alert-box">
                <h4 className="config-alert-title">Estado del Microservicio ML</h4>
                <p className="config-alert-text">
                  Conectado a: <code>http://127.0.0.1:8000</code> <br />
                  Último entrenamiento: <strong>Hace 2 días</strong> <br />
                  Margen de Error MAE: <strong>±3.2%</strong>
                </p>
              </div>

              <div className="config-margin-bottom-15">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periodo de Histórico a Evaluar</label>
                <select className="login-input" style={{ paddingLeft: '10px' }}>
                  <option>Últimos 30 días</option>
                  <option>Últimos 3 meses (Recomendado)</option>
                  <option>Últimos 6 meses</option>
                  <option>Todo el histórico disponible</option>
                </select>
              </div>

              <button className="btn-new config-btn-green" onClick={handleRetrain} disabled={training}>
                {training ? 'Entrenando...' : 'Forzar Reentrenamiento del Modelo'}
              </button>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="fade-in" style={{ padding: '24px' }}>
              <h3 className="card-title config-title-flex">
                <FaShieldHalved style={{ color: 'var(--text-muted)' }} /> Seguridad y Conexiones API
              </h3>
              <div className="config-margin-bottom-15">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Endpoint Base del Backend (Node.js)</label>
                <input type="text" readOnly defaultValue={API_BASE} className="login-input config-input-readonly config-monospace" />
              </div>
              <div className="config-margin-bottom-15">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clave JWT Secreta</label>
                <input type="password" readOnly defaultValue="**************************" className="login-input config-input-readonly" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Para modificar estas variables de entorno de infraestructura, debes editar directamente los archivos <code>.env</code> en el servidor y reiniciar los servicios.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
