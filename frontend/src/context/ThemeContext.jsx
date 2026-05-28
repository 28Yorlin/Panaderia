/**
 * Contexto de Tematización (ThemeContext)
 * 
 * Permite cambiar la apariencia global de la aplicación entre modo Claro y Oscuro.
 * Persiste la preferencia del usuario en el localStorage y aplica
 * el atributo `data-theme` al elemento raíz del DOM.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
