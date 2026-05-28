import { api } from './api';
export const getVentas = () => api.get('/ventas');
export const createVenta = (data) => api.post('/ventas', data);