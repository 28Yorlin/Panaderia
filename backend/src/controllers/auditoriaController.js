/**
 * Controlador de Auditoría y Bitácora
 * 
 * Permite listar de forma paginada todos los eventos críticos del sistema 
 * (Logins, Inserts, Updates, Deletes) registrados por el middleware o utils de auditoría.
 * Soporta búsqueda de texto en la tabla y acción.
 */
const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let where = '';
    let params = [];
    if (search) {
      where = 'WHERE a.accion LIKE ? OR a.tabla_afectada LIKE ? OR a.descripcion LIKE ? OR u.username LIKE ?';
      const s = `%${search}%`;
      params = [s, s, s, s];
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT a.id, a.accion, a.tabla_afectada, a.descripcion, a.ip_address, a.fecha,
              u.username as usuario
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ${where}
       ORDER BY a.fecha DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      meta: { total, page, last_page: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Auditoria]', err.message);
    res.status(500).json({ error: err.message });
  }
};

