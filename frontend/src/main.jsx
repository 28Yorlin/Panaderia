/**
 * Punto de Entrada Principal (main.jsx)
 * 
 * Arranca la aplicación de React montándola sobre el nodo `#root`.
 * Inyecta los proveedores globales de Contexto (Theme, Auth) 
 * y carga los estilos base (CSS).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './assets/styles/variables.css';
import './assets/styles/global.css';
import './assets/styles/crud.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
