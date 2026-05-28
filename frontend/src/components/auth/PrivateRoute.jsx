/**
 * Componente de Protección de Rutas (PrivateRoute)
 * 
 * Intercepta la navegación hacia rutas privadas. Si el usuario no está
 * autenticado o su token expiró, lo redirige automáticamente al `/login`.
 * Si está en proceso de validación, muestra un loader.
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../common/Loader';

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
