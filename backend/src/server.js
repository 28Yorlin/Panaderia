/**
 * Punto de Entrada Principal (Entry Point) - Backend Node.js
 * 
 * Inicializa la configuración de entorno, importa el servidor Express desde app.js,
 * y lo levanta en el puerto asignado (por defecto 5001).
 * Separa la lógica de red (listen) de la lógica de aplicación (Express) para facilitar el testing.
 */
require('dotenv').config();
const app = require('./app');

// Definición del puerto desde entorno o default
const PORT = process.env.PORT || 5001;

// Levantamiento del proceso en modo escucha
app.listen(PORT, () => console.log(`🚀 Backend Inicializado correctamente en http://localhost:${PORT}`));