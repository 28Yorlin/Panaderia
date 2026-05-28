/**
 * Contexto de Autenticación Global (AuthContext)
 * 
 * Gestiona el estado de sesión del usuario en el Frontend de forma centralizada.
 * Proveedor que inyecta la información del usuario actual, el token JWT y
 * los métodos para iniciar y cerrar sesión (login/logout).
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('invalid');
        return r.json();
      })
      .then((d) => setUser(d.user))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Error login:', err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook personalizado para acceder fácilmente al contexto de autenticación.
 * 
 * @returns {{ user: Object, loading: boolean, login: Function, logout: Function }}
 * @throws {Error} Si se usa fuera del AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
