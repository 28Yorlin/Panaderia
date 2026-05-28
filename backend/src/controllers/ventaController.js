/**
 * Controlador de Ventas
 * 
 * Gestiona el ciclo de vida de las ventas en el punto de venta (POS).
 * Incluye la creación de transacciones, actualización simultánea de inventarios,
 * registro de pagos y generación de estadísticas comerciales.
 */
const db = require('../config/database');
const { ensureCalendarioRow } = require('../utils/calendario');
const { registrarAuditoria } = require('../utils/auditoria');

/**
 * Recupera el listado de ventas históricas.
 * Soporta paginación, filtros por fecha, cliente y búsqueda general.
 * 
 * @param {Object} req - Petición HTTP con query params (page, limit, search, fecha, cliente_id)
 * @param {Object} res - Respuesta HTTP con los datos paginados
 */
exports.getAll = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const fecha = req.query.fecha;
    const cliente_id = req.query.cliente_id;

    let baseSelect = `
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;

    let whereClause = '';
    let params = [];

    if (cliente_id) {
      whereClause += ' AND v.cliente_id = ?';
      params.push(cliente_id);
    }

    if (fecha) {
      whereClause += ' AND v.fecha_venta = ?';
      params.push(fecha);
    }

    if (search) {
      whereClause += ' AND (c.nombre LIKE ? OR v.id = ? OR u.username LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, search, searchParam);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total ${baseSelect} ${whereClause}`, params);

    let rowsParams = [...params];
    
    if (isAll) {
      const [rows] = await db.query(`
        SELECT v.id, v.fecha_venta, v.hora_venta, v.total, v.estado_pago, v.tipo_pago,
               COALESCE(TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))), 'Cliente Genérico') as cliente_nombre,
               COALESCE(u.username, 'Sistema') as usuario_nombre
        ${baseSelect}
        ${whereClause}
        ORDER BY v.fecha_venta DESC, v.hora_venta DESC
      `, rowsParams);
      return res.json(rows);
    }

    const [rows] = await db.query(`
      SELECT v.id, v.fecha_venta, v.hora_venta, v.total, v.estado_pago, v.tipo_pago,
             COALESCE(TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))), 'Cliente Genérico') as cliente_nombre,
             COALESCE(u.username, 'Sistema') as usuario_nombre
      ${baseSelect}
      ${whereClause}
      ORDER BY v.fecha_venta DESC, v.hora_venta DESC
      LIMIT ? OFFSET ?
    `, [...rowsParams, limit, offset]);

    res.json({
      data: rows,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('ERROR EN GET ALL VENTAS:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

/**
 * Procesa y registra una nueva venta en el sistema.
 * Es una operación transaccional: Si falla la inserción del detalle o el descuento 
 * del stock, se revierte toda la venta (Rollback) para mantener consistencia financiera.
 */
exports.create = async (req, res) => {
  const { total, items, id_cliente, tipo_pago, tipo_comprobante } = req.body;
  const id_usuario = req.user?.id || 1; // Fallback a 1 si no hay auth
  let connection;

  try {
    const hoy = new Date().toISOString().split('T')[0];
    await ensureCalendarioRow(hoy); // Previene errores de Foreign Key en MySQL

    connection = await db.getConnection();
    await connection.beginTransaction(); // Inicio de transacción segura

    // 1. Insertar Cabecera: Se crea el registro principal de la factura/ticket
    const [ventaResult] = await connection.query(
      'INSERT INTO ventas (fecha_venta, hora_venta, usuario_id, cliente_id, total, estado_pago, tipo_pago, tipo_comprobante) VALUES (CURDATE(), CURTIME(), ?, ?, ?, "PAGADO", ?, ?)',
      [id_usuario, id_cliente || null, total, tipo_pago || 'Efectivo', tipo_comprobante || 'Ticket']
    );
    const venta_id = ventaResult.insertId;

    // 1.1 Registrar el pago en la tabla pagos
    await connection.query(
      'INSERT INTO pagos (venta_id, metodo_pago, monto, fecha) VALUES (?, ?, ?, NOW())',
      [venta_id, tipo_pago || 'Efectivo', total]
    );

    // 2. Insertar los detalles y actualizar inventario
    for (let item of items) {
      // Guardar detalle
      await connection.query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [venta_id, item.id, item.cantidad, item.precio, item.cantidad * item.precio]
      );
      
      // Descontar stock en inventario
      await connection.query(
        'UPDATE inventario SET stock_actual = stock_actual - ? WHERE producto_id = ?', 
        [item.cantidad, item.id]
      );

      // Registrar movimiento de inventario
      await connection.query(
        `INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, cantidad, motivo)
         VALUES (?, ?, 'SALIDA', ?, 'VENTA')`,
        [item.id, id_usuario, item.cantidad]
      );
    }

    await connection.commit();

    // Registrar en auditoría
    const desc = `Venta #${venta_id} registrada por S/ ${parseFloat(total).toFixed(2)} (${items.length} items)`;
    await registrarAuditoria(id_usuario, 'INSERT', 'ventas', desc, req.ip);

    res.status(201).json({ message: 'Venta registrada con éxito', id_venta: venta_id });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR EN CREATE VENTA:', err);
    res.status(500).json({ error: 'No se pudo procesar la venta. Verifica el stock.' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Obtiene el detalle completo de una venta específica por su ID.
 * Útil para la reimpresión de comprobantes o revisión de transacciones pasadas.
 */
exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const [sale] = await db.query(`
      SELECT v.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `, [id]);

    if (sale.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const [items] = await db.query(`
      SELECT dv.*, p.nombre as producto_nombre
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = ?
    `, [id]);

    res.json({ ...sale[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Calcula las estadísticas financieras y de ventas en tiempo real.
 * Utilizado por el panel de reportes para mostrar el estado del negocio.
 * Permite filtrar por rango de fechas (desde/hasta).
 */
exports.getStats = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    
    // Total Ventas (con filtro de fecha si existe)
    let totalVentasQuery = 'SELECT SUM(total) as totalVentas FROM ventas WHERE estado_pago = "PAGADO"';
    if (desde && hasta) totalVentasQuery += ' AND fecha_venta BETWEEN ? AND ?';
    const [[{ totalVentas }]] = await db.query(totalVentasQuery, desde && hasta ? [desde, hasta] : []);

    const [[{ ventasHoy }]] = await db.query('SELECT SUM(total) as ventasHoy FROM ventas WHERE fecha_venta = CURDATE() AND estado_pago = "PAGADO"');
    
    // Total Compras (con filtro de fecha si existe)
    let totalComprasQuery = 'SELECT SUM(total) as totalCompras FROM compras WHERE estado = "COMPLETADO"';
    if (desde && hasta) totalComprasQuery += ' AND fecha BETWEEN ? AND ?';
    const [[{ totalCompras }]] = await db.query(totalComprasQuery, desde && hasta ? [desde, hasta] : []);
    
    // Top Productos (con filtro de fecha si existe)
    let topQuery = `
      SELECT p.nombre, SUM(dv.cantidad) as total_vendido
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      WHERE v.estado_pago = "PAGADO"
    `;
    if (desde && hasta) topQuery += ' AND v.fecha_venta BETWEEN ? AND ?';
    topQuery += `
      GROUP BY p.id
      ORDER BY total_vendido DESC
      LIMIT 5
    `;
    const [topProductos] = await db.query(topQuery, desde && hasta ? [desde, hasta] : []);

    // Ventas Mensuales (o en el rango si existe)
    let monthlyQuery = `
      SELECT fecha_venta as date, SUM(total) as total
      FROM ventas
      WHERE estado_pago = "PAGADO"
    `;
    if (desde && hasta) {
      monthlyQuery += ' AND fecha_venta BETWEEN ? AND ?';
    } else {
      monthlyQuery += ' AND fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    monthlyQuery += `
      GROUP BY fecha_venta
      ORDER BY fecha_venta
    `;
    const [ventasMensuales] = await db.query(monthlyQuery, desde && hasta ? [desde, hasta] : []);

    res.json({
      summary: {
        totalVentas: totalVentas || 0,
        ventasHoy: ventasHoy || 0,
        totalCompras: totalCompras || 0,
      },
      topProductos,
      ventasMensuales
    });
  } catch (err) {
    console.error('ERROR EN GET STATS:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};