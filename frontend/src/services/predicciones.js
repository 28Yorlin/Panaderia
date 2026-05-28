import { api } from './api';
export const generarPrediccion = () => api.post('/prediccion/generar');