/**
 * Controlador de Producción (Backoffice)
 * 
 * Se encarga de gestionar las órdenes de fabricación de pan.
 * Administra el estado (Pendiente, Completado, Anulado), el Kárdex de inventario
 * y el registro en la bitácora de auditoría.
 */
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Retorna el historial de producción (órdenes creadas).
 * Incluye filtros de búsqueda y paginación para optimizar la carga del Frontend.
 */
exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, estado } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, prod.nombre as producto
      FROM produccion p
      JOIN productos prod ON p.producto_id = prod.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM produccion p JOIN productos prod ON p.producto_id = prod.id';
    let params = [];
    let countParams = [];

    let whereClauses = [];
    
    if (search) {
      whereClauses.push('prod.nombre LIKE ?');
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (estado) {
      whereClauses.push('p.estado = ?');
      params.push(estado);
      countParams.push(estado);
    }

    if (whereClauses.length > 0) {
      const whereStr = ' WHERE ' + whereClauses.join(' AND ');
      query += whereStr;
      countQuery += whereStr;
    }

    query += ' ORDER BY p.fecha DESC, p.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);
    const [countRows] = await db.query(countQuery, countParams);

    res.json({
      data: rows,
      meta: {
        total: countRows[0].total,
        page: parseInt(page),
        last_page: Math.ceil(countRows[0].total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producción' });
  }
};

/**
 * Genera una nueva Orden de Producción en estado 'PENDIENTE'.
 * Define cuánto pan se planea hornear en base a la predicción de IA o decisión manual.
 */
exports.create = async (req, res) => {
  try {
    const { producto_id, cantidad_programada, fecha, usuario_id } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO produccion (producto_id, cantidad_programada, fecha, estado, usuario_id) VALUES (?, ?, ?, "PENDIENTE", ?)',
      [producto_id, cantidad_programada, fecha || new Date(), usuario_id || null]
    );
    
    // Obtener nombre del producto para auditoría
    const [prodRows] = await db.query('SELECT nombre FROM productos WHERE id = ?', [producto_id]);
    const productoNombre = prodRows.length > 0 ? prodRows[0].nombre : 'Desconocido';

    // Registrar en auditoría
    const desc = `Registró orden de producción #${result.insertId} (Producto: ${productoNombre}) - Cantidad Programada: ${cantidad_programada}`;
    const id_usuario = req.user?.id || 1;
    await registrarAuditoria(id_usuario, 'INSERT', 'produccion', desc, req.ip);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar producción' });
  }
};

/**
 * Cierra la orden de producción y marca el pan como horneado ('COMPLETADO').
 * Este paso es crítico porque inserta los nuevos productos al Inventario Físico (Kárdex).
 */
exports.complete = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_producida } = req.body;
    
    // 1. Obtener los datos de la producción y producto
    const [[prodRecord]] = await db.query(
      'SELECT p.producto_id, prod.nombre FROM produccion p JOIN productos prod ON p.producto_id = prod.id WHERE p.id = ?',
      [id]
    );
    
    if (!prodRecord) {
      return res.status(404).json({ error: 'Registro de producción no encontrado' });
    }
    
    // 2. Marcar como completado
    await db.query(
      'UPDATE produccion SET estado = "COMPLETADO", cantidad_producida = ? WHERE id = ?',
      [cantidad_producida, id]
    );
    
    // 3. Aumentar el stock en el inventario
    await db.query(
      'INSERT INTO inventario (producto_id, stock_actual) VALUES (?, ?) ON DUPLICATE KEY UPDATE stock_actual = stock_actual + ?',
      [prodRecord.producto_id, cantidad_producida, cantidad_producida]
    );
    
    // 4. Registrar el movimiento en el Kárdex (movimientos_inventario)
    await db.query(
      'INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, cantidad, motivo) VALUES (?, ?, "ENTRADA", ?, "PRODUCCION")',
      [prodRecord.producto_id, req.user?.id || 1, cantidad_producida]
    );
    
    // Registrar en auditoría
    const desc = `Completó producción #${id} (Producto: ${prodRecord.nombre}) - Cantidad Producida: ${cantidad_producida}`;
    const id_usuario = req.user?.id || 1;
    await registrarAuditoria(id_usuario, 'UPDATE', 'produccion', desc, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al completar producción' });
  }
};

/**
 * Cancela una orden de producción ('ANULADO').
 * Se usa si la masa se echó a perder antes de hornear o hubo un error humano.
 */
exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener los datos de la producción antes de anular
    const [[prodRecord]] = await db.query(
      'SELECT p.producto_id, prod.nombre FROM produccion p JOIN productos prod ON p.producto_id = prod.id WHERE p.id = ?',
      [id]
    );
    const prodNombre = prodRecord ? prodRecord.nombre : 'Desconocido';

    await db.query(
      'UPDATE produccion SET estado = "ANULADO" WHERE id = ?',
      [id]
    );
    
    // Registrar en auditoría
    const desc = `Anuló producción #${id} (Producto: ${prodNombre})`;
    const id_usuario = req.user?.id || 1;
    await registrarAuditoria(id_usuario, 'UPDATE', 'produccion', desc, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al anular producción' });
  }
};
