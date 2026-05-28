/**
 * Configuración de Base de Datos
 * 
 * Establece un pool de conexiones con MySQL utilizando la librería mysql2.
 * El uso de un "pool" mejora el rendimiento de la aplicación al reutilizar 
 * conexiones activas en lugar de abrir y cerrar una conexión por cada petición HTTP.
 */

const mysql = require('mysql2');
require('dotenv').config();

// Se obtienen las credenciales desde variables de entorno (.env) para evitar exponer contraseñas en el código
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'panaderia_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true, // Pone en cola las consultas si el límite de conexiones se alcanza
  connectionLimit: 10       // Máximo número de conexiones simultáneas permitidas
});

// Exportamos la versión basada en Promesas para poder usar async/await en los controladores
module.exports = pool.promise();