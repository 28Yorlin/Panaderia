/**
 * Controlador de Pagos
 * 
 * Centraliza la consulta del historial de pagos efectuados en el punto de venta.
 * Realiza cruces (JOINs) con las tablas de ventas y clientes para mostrar un recibo detallado.
 */
const db = require('../config/database');

/**
 * Consulta la relación de pagos registrados en el sistema.
 * Soporta paginación y búsqueda por método de pago, cliente o número de venta.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT p.*, CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) AS cliente_nombre 
      FROM pagos p
      LEFT JOIN ventas v ON p.venta_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (search) {
      query += ` AND (p.metodo_pago LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ? OR p.venta_id LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.fecha DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [rows] = await db.query(query, queryParams);

    // Count total
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM pagos p
      LEFT JOIN ventas v ON p.venta_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND (p.metodo_pago LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ? OR p.venta_id LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await db.query(countQuery, countParams);

    res.json({
      data: rows,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error en getAll pagos:", error);
    res.status(500).json({ error: error.message });
  }
};
