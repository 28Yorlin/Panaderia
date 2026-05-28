/**
 * Controlador de Mermas (Pérdidas de Inventario)
 * 
 * Gestiona el registro de productos que se han dañado, caducado o perdido.
 * Se encarga de descontar dichas cantidades del inventario físico y llevar 
 * el registro de auditoría para evitar robos internos.
 */
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Retorna el listado paginado de todas las mermas históricas.
 * Se cruza con la tabla de productos para mostrar el nombre del pan afectado.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM mermas');

    const [rows] = await db.query(`
      SELECT m.id, m.producto_id, p.nombre as producto_nombre, m.fecha, m.cantidad_perdida, m.motivo, m.created_at 
      FROM mermas m
      JOIN productos p ON m.producto_id = p.id
      ORDER BY m.fecha DESC, m.id DESC
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
    console.error('ERROR EN GET MERMAS:', err);
    res.status(500).json({ error: 'Error al obtener mermas' });
  }
};

/**
 * Registra una nueva pérdida/merma en el sistema.
 * Es una operación transaccional: Inserta la merma, descuenta el stock actual
 * y registra una salida manual en el Kárdex (movimientos_inventario).
 */
exports.create = async (req, res) => {
  const { producto_id, fecha, cantidad_perdida, motivo } = req.body;
  const usuario_id = req.user?.id || 1;
  let connection;

  try {
    if (!producto_id || !cantidad_perdida) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const fechaFinal = fecha || new Date().toISOString().split('T')[0];

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Insertar en mermas
    const [result] = await connection.query(
      'INSERT INTO mermas (producto_id, usuario_id, fecha, cantidad_perdida, motivo) VALUES (?, ?, ?, ?, ?)',
      [producto_id, usuario_id, fechaFinal, cantidad_perdida, motivo || 'Dañado']
    );

    // 2. Descontar del stock en inventario
    await connection.query(
      'UPDATE inventario SET stock_actual = stock_actual - ? WHERE producto_id = ?', 
      [cantidad_perdida, producto_id]
    );

    // 3. Registrar movimiento de inventario
    await connection.query(
      `INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, cantidad, motivo)
       VALUES (?, ?, 'SALIDA', ?, 'MERMA')`,
      [producto_id, usuario_id, cantidad_perdida]
    );

    await connection.commit();

    // Registrar en auditoría
    const desc = `Merma registrada para producto ID ${producto_id}: Cantidad perdida: ${cantidad_perdida} - Motivo: ${motivo || 'Dañado'}`;
    await registrarAuditoria(usuario_id, 'INSERT', 'mermas', desc, req.ip);

    res.json({ id: result.insertId, success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR EN CREATE MERMA:', err);
    res.status(500).json({ error: 'Error al registrar merma' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Anula una merma registrada por error.
 * Revierte el descuento de inventario, devolviendo las unidades al stock (ENTRADA)
 * y elimina el registro de la merma. Requiere transacción.
 */
exports.remove = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Obtener datos de la merma antes de borrarla para devolver el stock
    const [[merma]] = await connection.query('SELECT producto_id, cantidad_perdida FROM mermas WHERE id = ?', [id]);
    
    if (merma) {
      // Devolver stock
      await connection.query(
        'UPDATE inventario SET stock_actual = stock_actual + ? WHERE producto_id = ?',
        [merma.cantidad_perdida, merma.producto_id]
      );

      // Registrar movimiento de devolución
      await connection.query(
        `INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, cantidad, motivo)
         VALUES (?, 1, 'ENTRADA', ?, 'ANULACION MERMA')`,
        [merma.producto_id, merma.cantidad_perdida]
      );
    }

    await connection.query('DELETE FROM mermas WHERE id = ?', [id]);

    await connection.commit();

    // Registrar en auditoría
    if (merma) {
      const desc = `Anuló merma #${id} (devolviendo ${merma.cantidad_perdida} unidades al producto ID ${merma.producto_id})`;
      await registrarAuditoria(req.user?.id || 1, 'DELETE', 'mermas', desc, req.ip);
    }

    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR EN REMOVE MERMA:', err);
    res.status(500).json({ error: 'Error al eliminar merma' });
  } finally {
    if (connection) connection.release();
  }
};
