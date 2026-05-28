/**
 * Controlador de Inventario Físico
 * 
 * Expone un endpoint exclusivo para revisar las existencias actuales de cada producto
 * (Panes, Pasteles, etc) disponibles para la venta.
 */
const db = require('../config/database');

/**
 * Consulta el stock actual de todos los productos terminados.
 * Integra los datos con el maestro de productos para mostrar el nombre.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM inventario');

    const [rows] = await db.query(`
      SELECT i.*, p.nombre as producto_nombre
      FROM inventario i
      LEFT JOIN productos p ON i.producto_id = p.id
      ORDER BY i.fecha DESC, i.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({
      data: rows,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial de inventario' });
  }
};
