/**
 * Configuración Base de Axios
 * 
 * Define la instancia principal para solicitudes HTTP. Intercepta
 * peticiones salientes para inyectar el Token JWT y captura respuestas 401
 * para forzar cierres de sesión automáticos si el token expira.
 */
import axios from 'axios';
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);
