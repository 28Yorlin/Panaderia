/**
 * Controlador de Predicciones
 * 
 * Gestiona la comunicación entre el Backend (Node.js) y el Microservicio de Machine Learning (Python).
 * Se encarga de solicitar predicciones, guardar el historial en la base de datos y proveer 
 * resúmenes estadísticos al Frontend.
 */

const db = require('../config/database');
const axios = require('axios');
const { ensureCalendarioRow } = require('../utils/calendario');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Solicita la predicción de ventas para una fecha específica al motor de IA.
 * Este proceso itera sobre el catálogo de productos activos, envía la petición al modelo Python,
 * y persiste los resultados en la base de datos.
 * 
 * @param {Object} req - Objeto de petición HTTP (body.fecha)
 * @param {Object} res - Objeto de respuesta HTTP
 */
exports.generar = async (req, res) => {
  try {
    const { fecha } = req.body;
    // Si no se provee fecha, asumimos el día de hoy
    const targetDate = fecha || new Date().toISOString().split('T')[0];
    
    // Garantizar que la fecha exista en la tabla de calendario para evitar errores de integridad referencial
    await ensureCalendarioRow(targetDate);
    
    // Extraer únicamente productos activos para la inferencia
    const [productosDb] = await db.query('SELECT id, nombre, precio_venta AS precio FROM productos WHERE estado = 1 ORDER BY nombre');
    const predicciones = [];

    for (const prod of productosDb) {
      try {
        // Llamada síncrona al microservicio de Python
        const mlRes = await axios.post(`${ML_URL}/predecir`, {
          fecha: targetDate,
          producto: prod.nombre,
          precio: Number(prod.precio),
          es_feriado: 0 // Simplificación por ahora, escalable a futuro
        });
        
        // Redondeamos la predicción porque no podemos vender medios panes
        const cantidad_estimada = Math.round(mlRes.data.cantidad_estimada || 0);
        
        // Limpiamos predicciones previas de esa misma fecha para evitar duplicados en el historial
        await db.query(
          'DELETE FROM predicciones WHERE modelo_id = 1 AND producto_id = ? AND fecha_objetivo = ?',
          [prod.id, targetDate]
        );
        
        // Insertamos el nuevo registro predictivo
        await db.query(
          `INSERT INTO predicciones (modelo_id, producto_id, fecha_objetivo, cantidad_estimada)
           VALUES (1, ?, ?, ?)`,
          [prod.id, targetDate, cantidad_estimada]
        );
        
        predicciones.push({ ...mlRes.data, id_producto: prod.id, cantidad_estimada });
      } catch (e) { 
        console.error(`Error al predecir para el producto ${prod.nombre}:`, e.message); 
      }
    }
    res.json({ predicciones });
  } catch (err) {
    console.error('Error fatal en generación de predicciones:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Recupera el historial paginado de días donde se generaron predicciones.
 * Útil para la tabla lateral del Dashboard de Predicciones.
 */
exports.historial = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const offset = (page - 1) * limit;

    const [countRows] = await db.query('SELECT COUNT(DISTINCT fecha_objetivo) as total FROM predicciones');
    const totalItems = countRows[0].total;

    const [rows] = await db.query(
      'SELECT fecha_objetivo AS fecha, SUM(cantidad_estimada) AS total FROM predicciones GROUP BY fecha_objetivo ORDER BY fecha_objetivo DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      data: rows,
      meta: {
        total: Number(totalItems),
        page: Number(page),
        last_page: Math.ceil(Number(totalItems) / limit)
      }
    });
  } catch (err) {
    console.error('ERROR HISTORIAL:', err);
    res.status(500).json({ data: [], meta: { total: 0, page: 1, last_page: 1 } });
  }
};

/**
 * Recupera el desglose detallado de predicciones (por producto) de una fecha histórica específica.
 * Esto evita volver a llamar a la IA cuando el usuario da clic en el historial.
 */
exports.resumen = async (req, res) => {
  const fecha = req.params.fecha;
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.nombre AS producto, pr.cantidad_estimada
       FROM predicciones pr
       JOIN productos p ON p.id = pr.producto_id
       WHERE pr.fecha_objetivo = ?`, [fecha]
    );
    res.json({ porProducto: rows });
  } catch (err) { 
    console.error('Error al recuperar resumen de fecha:', err);
    res.json({ porProducto: [] }); 
  }
};

/**
 * Proxy para forzar el reentrenamiento del modelo de Machine Learning.
 * Redirige la petición al microservicio de Python.
 */
exports.entrenar = async (req, res) => {
  try {
    const mlRes = await axios.post(`${ML_URL}/entrenar`);
    res.json(mlRes.data);
  } catch (err) { 
    console.error('Fallo de comunicación con IA durante entrenamiento:', err.message);
    res.status(500).json({ error: 'IA no disponible para entrenamiento.' }); 
  }
};
