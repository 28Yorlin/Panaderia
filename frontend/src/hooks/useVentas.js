import { useState, useEffect } from 'react';
import { getVentas } from '../services/ventas';
export function useVentas() {
  const [ventas, setVentas] = useState([]);
  useEffect(() => { getVentas().then(res => setVentas(res.data)).catch(() => {}); }, []);
  return { ventas };
}