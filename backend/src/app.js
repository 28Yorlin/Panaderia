/**
 * Configuración del Servidor Express (App)
 * 
 * Centraliza el enrutamiento, configuración de Middlewares globales (como CORS y Parseo JSON)
 * y el manejo centralizado de errores.
 * Define la estructura base de toda la API RESTful.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { requireAuth } = require('./middlewares/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// Servir estáticamente el directorio de imágenes (productos subidos por multer)
// Permite que el frontend cargue imágenes directamente usando la URL del servidor
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------------------------
// MAPEO DE RUTAS (ROUTER DEFINITION)
// -------------------------------------------------------------
// Rutas públicas (No requieren Token JWT)
app.use('/api/auth', require('./routes/auth.routes'));

// Rutas privadas (Protegidas por Middleware de Autenticación requireAuth)

app.use('/api/productos', requireAuth, require('./routes/productos.routes'));
app.use('/api/categorias', requireAuth, require('./routes/categorias.routes'));
app.use('/api/ventas', requireAuth, require('./routes/ventas.routes'));
app.use('/api/prediccion', requireAuth, require('./routes/predicciones.routes'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard.routes'));
app.use('/api/insumos', requireAuth, require('./routes/insumos.routes'));
app.use('/api/clientes', requireAuth, require('./routes/clientes.routes'));
app.use('/api/usuarios', requireAuth, require('./routes/usuarios.routes'));
app.use('/api/mermas', requireAuth, require('./routes/mermas.routes'));
app.use('/api/recetas', requireAuth, require('./routes/recetas.routes'));
app.use('/api/produccion', requireAuth, require('./routes/produccion.routes'));
app.use('/api/inventario', requireAuth, require('./routes/inventario.routes'));
app.use('/api/kardex', requireAuth, require('./routes/kardex.routes'));
app.use('/api/proveedores', requireAuth, require('./routes/proveedores.routes'));
app.use('/api/compras', requireAuth, require('./routes/compras.routes'));
app.use('/api/gastos', requireAuth, require('./routes/gastos.routes'));
app.use('/api/cajachica', requireAuth, require('./routes/cajachica.routes'));
app.use('/api/roles', requireAuth, require('./routes/roles.routes'));
app.use('/api/auditoria', requireAuth, require('./routes/auditoria.routes'));
app.use('/api/pagos', requireAuth, require('./routes/pagos.routes'));

// Middleware global para atrapar excepciones no controladas en las rutas (Evita caída del servidor)
app.use(require('./middlewares/errorHandler'));

module.exports = app;