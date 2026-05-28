/**
 * Componente Paleta de Comandos (CommandPalette)
 * 
 * Permite la navegación ultra-rápida entre módulos de la aplicación.
 * Se activa mediante el atajo de teclado global (Ctrl+K o Cmd+K) y
 * filtra en tiempo real los enlaces disponibles según la búsqueda del usuario.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiHome, FiBox, FiUsers, FiShoppingCart, 
  FiTrendingUp, FiSettings, FiFileText, FiUser 
} from 'react-icons/fi';

const PAGES = [
  { name: 'Dashboard', path: '/', icon: <FiHome /> },
  { name: 'Productos', path: '/productos', icon: <FiBox /> },
  { name: 'Clientes', path: '/clientes', icon: <FiUsers /> },
  { name: 'Ventas (POS)', path: '/ventas', icon: <FiShoppingCart /> },
  { name: 'Predicción IA', path: '/prediccion', icon: <FiTrendingUp /> },
  { name: 'Producción', path: '/produccion', icon: <FiFileText /> },
  { name: 'Usuarios', path: '/usuarios', icon: <FiUser /> },
  { name: 'Configuración', path: '/configuracion', icon: <FiSettings /> },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenEvent);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = PAGES.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette-box" onClick={e => e.stopPropagation()}>
        <div className="cp-search-area">
          <FiSearch size={20} color="var(--brand-600)" />
          <input 
            ref={inputRef}
            placeholder="¿A dónde quieres ir?..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd>ESC</kbd>
        </div>
        
        <div className="cp-results">
          {filtered.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se encontraron resultados para "{query}"
            </p>
          ) : (
            filtered.map(item => (
              <div 
                key={item.path} 
                className="cp-item"
                onClick={() => handleSelect(item.path)}
              >
                <div className="cp-item-icon">{item.icon}</div>
                <span>{item.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.5 }}>Ir a {item.path}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
