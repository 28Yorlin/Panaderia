/**
 * Componente de Autenticación (Login)
 * 
 * Gestiona el formulario de acceso al sistema y se comunica con el
 * contexto de autenticación global (AuthContext) para establecer la sesión.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaStore } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import '../assets/styles/login.css';

export default function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  /**
   * Intercepta el evento submit del formulario, activa el estado de carga
   * y llama al método login() expuesto por el Contexto. Si es válido, redirecciona al Dashboard.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await login(credentials.email, credentials.password);
      if (success) {
        navigate('/');
      } else {
        Swal.fire({
          title: 'Acceso Denegado',
          text: 'Usuario o contraseña incorrectos.',
          icon: 'error',
          confirmButtonColor: '#b45309'
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><FaStore /></div>
          <h1 className="login-title">Rincón Panadero</h1>
          <p className="login-subtitle">Sistema de Gestión y Predicción</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              name="email"
              className="login-input"
              placeholder="Usuario o Correo"
              value={credentials.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              name="password"
              className="login-input"
              placeholder="Contraseña"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'INGRESANDO...' : 'INGRESAR AL SISTEMA'}
          </button>
        </form>


      </div>
    </div>
  );
}
