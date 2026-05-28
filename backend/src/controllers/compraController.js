/**
 * Controlador de Compras
 * 
 * Gestiona el abastecimiento de materia prima (insumos).
 * Cada compra afecta directamente el stock de insumos y el registro de egresos,
 * actualizando el historial de movimientos de inventario de forma segura (transaccional).
 */
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Retorna el listado del historial de compras.
 * Soporta paginación y trae el nombre del proveedor mediante un JOIN.
 */
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM compras');
    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.total, c.estado, p.nombre_empresa as proveedor
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
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
    console.error('ERROR EN GET ALL COMPRAS:', err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
};

/**
 * Registra una nueva compra en el sistema.
 * Es un proceso transaccional que:
 * 1. Crea la factura de compra.
 * 2. Guarda el detalle (items comprados).
 * 3. Actualiza sumando el stock en la tabla de insumos.
 * 4. Deja registro en la tabla pivote de movimientos_insumos.
 */
exports.create = async (req, res) => {
  const { total, proveedor_id, items } = req.body;
  const usuario_id = req.user?.id || 1;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Crear la cabecera de la compra
    const [compraResult] = await connection.query(
      'INSERT INTO compras (fecha, proveedor_id, usuario_id, total, estado) VALUES (CURDATE(), ?, ?, ?, "COMPLETADO")',
      [proveedor_id || null, usuario_id, total]
    );
    const compra_id = compraResult.insertId;

    // 2. Insertar los detalles y actualizar stock de insumos
    for (let item of items) {
      // Detalle de Compra
      await connection.query(
        'INSERT INTO detalle_compras (compra_id, insumo_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [compra_id, item.id_insumo, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
      );
      
      // Actualizar stock en tabla insumos
      await connection.query(
        'UPDATE insumos SET stock_actual = stock_actual + ? WHERE id = ?', 
        [item.cantidad, item.id_insumo]
      );

      // Registrar movimiento de insumos
      await connection.query(
        `INSERT INTO movimientos_insumos (insumo_id, usuario_id, tipo_movimiento, cantidad, motivo)
         VALUES (?, ?, 'ENTRADA', ?, 'COMPRA')`,
        [item.id_insumo, usuario_id, item.cantidad]
      );
    }

    await connection.commit();

    // Registrar en auditoría
    const desc = `Compra registrada #${compra_id} por S/ ${parseFloat(total).toFixed(2)}`;
    await registrarAuditoria(usuario_id, 'INSERT', 'compras', desc, req.ip);

    res.status(201).json({ message: 'Compra registrada con éxito', id_compra: compra_id });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR EN CREATE COMPRA:', err);
    res.status(500).json({ error: 'Error al registrar la compra' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Recupera el detalle completo de una factura de compra por su ID.
 * Útil para la revisión de comprobantes detallados en el panel administrativo.
 */
exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const [compra] = await db.query(`
      SELECT c.*, p.nombre_empresa as proveedor
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE c.id = ?
    `, [id]);

    if (compra.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const [items] = await db.query(`
      SELECT dc.*, i.nombre as insumo_nombre
      FROM detalle_compras dc
      JOIN insumos i ON dc.insumo_id = i.id
      WHERE dc.compra_id = ?
    `, [id]);

    res.json({ ...compra[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
