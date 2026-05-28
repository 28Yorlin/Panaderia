/**
 * Controlador de Gastos Operativos
 * 
 * Centraliza el registro de gastos fijos o variables del negocio 
 * (luz, agua, transporte, empaques, etc.) que no pertenecen a insumos directos.
 * Útil para el análisis financiero en el Dashboard.
 */
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Consulta la lista paginada de todos los gastos registrados en el sistema.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM gastos');
    const [rows] = await db.query(`
      SELECT g.id, g.fecha_gasto, g.descripcion, g.monto, u.nombre as usuario
      FROM gastos g
      LEFT JOIN usuarios u ON g.usuario_id = u.id
      ORDER BY g.fecha_gasto DESC, g.id DESC
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
    console.error('ERROR EN GET ALL GASTOS:', err);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

/**
 * Registra un nuevo gasto operativo y lo asocia al usuario actual.
 */
exports.create = async (req, res) => {
  try {
    const { descripcion, monto, fecha_gasto } = req.body;
    const usuario_id = req.user?.id || 1;

    if (!descripcion || !monto) {
      return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO gastos (fecha_gasto, descripcion, monto, usuario_id) VALUES (?, ?, ?, ?)',
      [fecha_gasto || new Date().toISOString().split('T')[0], descripcion, monto, usuario_id]
    );

    // Registrar en auditoría
    const desc = `Gasto registrado: S/ ${parseFloat(monto).toFixed(2)} - Descripción: ${descripcion}`;
    await registrarAuditoria(usuario_id, 'INSERT', 'gastos', desc, req.ip);

    res.json({ id: result.insertId, descripcion, monto, fecha_gasto });
  } catch (err) {
    console.error('ERROR EN CREATE GASTO:', err);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
};

/**
 * Elimina físicamente un gasto registrado y graba el evento en auditoría.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [[gastoRecord]] = await db.query('SELECT descripcion, monto FROM gastos WHERE id = ?', [id]);
    await db.query('DELETE FROM gastos WHERE id = ?', [id]);

    // Registrar en auditoría
    if (gastoRecord) {
      const desc = `Eliminó gasto #${id}: S/ ${parseFloat(gastoRecord.monto).toFixed(2)} - Descripción: ${gastoRecord.descripcion}`;
      await registrarAuditoria(req.user?.id || 1, 'DELETE', 'gastos', desc, req.ip);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('ERROR EN REMOVE GASTO:', err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
};
