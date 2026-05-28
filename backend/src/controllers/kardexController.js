/**
 * Controlador del Kárdex (Libro de Inventario)
 * 
 * Expone un endpoint de solo lectura para auditar todos los movimientos
 * (Entradas, Salidas, Ajustes, Mermas, Producción) de los productos físicos.
 * Crucial para la trazabilidad y la contabilidad.
 */
const db = require('../config/database');

/**
 * Consulta el historial cronológico de movimientos de inventario.
 * Puede ser filtrado para un producto específico para ver su ciclo de vida.
 */
exports.getKardex = async (req, res) => {
  try {
    const { producto_id } = req.query;
    let query = `
      SELECT m.*, p.nombre as producto_nombre, u.username as usuario_nombre
      FROM movimientos_inventario m
      LEFT JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
    `;
    let params = [];
    
    if (producto_id) {
      query += ` WHERE m.producto_id = ?`;
      params.push(producto_id);
    }
    
    query += ` ORDER BY m.created_at DESC`;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el kárdex' });
  }
};
