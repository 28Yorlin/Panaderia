/**
 * Controlador de Caja Chica
 * 
 * Gestiona pequeños ingresos y egresos de dinero diarios en efectivo 
 * que no necesariamente están ligados a ventas facturadas o compras grandes.
 * Registra cada movimiento en la bitácora de auditoría.
 */
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Retorna el historial de movimientos de caja chica, ordenado por los más recientes.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM caja_chica');
    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.tipo_movimiento, c.monto, c.descripcion, u.nombre as usuario
      FROM caja_chica c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.fecha DESC, c.id DESC
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
    res.status(500).json({ error: 'Error al obtener movimientos de caja chica' });
  }
};

/**
 * Registra un nuevo movimiento en la caja chica (Entrada o Salida de dinero).
 */
exports.create = async (req, res) => {
  try {
    const { tipo_movimiento, monto, descripcion, fecha } = req.body;
    const id_usuario = req.user?.id || 1;

    if (!tipo_movimiento || !monto || !descripcion) {
      return res.status(400).json({ error: 'Tipo de movimiento, monto y descripción son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO caja_chica (fecha, tipo_movimiento, monto, descripcion, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [fecha || new Date().toISOString().split('T')[0], tipo_movimiento, monto, descripcion, id_usuario]
    );

    // Registrar en auditoría
    const auditDesc = `Movimiento de Caja Chica registrado: ${tipo_movimiento} de S/ ${parseFloat(monto).toFixed(2)} - Descripción: ${descripcion}`;
    await registrarAuditoria(id_usuario, 'INSERT', 'caja_chica', auditDesc, req.ip);

    res.json({ id: result.insertId, tipo_movimiento, monto, descripcion, fecha });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar movimiento en caja chica' });
  }
};

/**
 * Elimina un registro de la caja chica que haya sido ingresado por error.
 * Deja una huella en auditoría del usuario que realizó la anulación.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cajaRecord]] = await db.query('SELECT tipo_movimiento, monto FROM caja_chica WHERE id = ?', [id]);
    await db.query('DELETE FROM caja_chica WHERE id = ?', [id]);

    // Registrar en auditoría
    if (cajaRecord) {
      const desc = `Eliminó registro de Caja Chica #${id}: ${cajaRecord.tipo_movimiento} de S/ ${parseFloat(cajaRecord.monto).toFixed(2)}`;
      await registrarAuditoria(req.user?.id || 1, 'DELETE', 'caja_chica', desc, req.ip);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar movimiento de caja chica' });
  }
};
