/**
 * Utilidad fetch encapsulada (apiFetch)
 * 
 * Proporciona un wrapper sobre la API nativa `fetch` de JavaScript.
 * Adjunta automáticamente el token JWT en las cabeceras y maneja
 * redirecciones por sesiones expiradas de manera uniforme.
 */
import { API_BASE } from './api';

/**
 * Petición autenticada al backend. `path` ej: `/api/dashboard`
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const token = localStorage.getItem('token');
  const isFormData = options.isFormData || options.body instanceof FormData;
  const headers = {
    // Si es FormData, NO ponemos Content-Type para que el browser lo fije con el boundary correcto
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const { isFormData: _, ...fetchOptions } = options;
  const res = await fetch(url, { ...fetchOptions, headers });
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }
  return res;
}
