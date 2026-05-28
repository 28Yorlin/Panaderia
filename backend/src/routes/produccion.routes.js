const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener lotes con paginación
router.get('/', async (req, res) => {
  const { fecha } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;

  try {
    let whereClause = '';
    const params = [];

    if (fecha) {
      whereClause = ' WHERE pd.fecha = ?';
      params.push(fecha);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM produccion pd ${whereClause}`, params);

    let sql = `
      SELECT pd.id, pd.fecha, pd.cantidad_programada, pd.cantidad_producida, pd.estado, p.nombre as producto_nombre
      FROM produccion pd
      LEFT JOIN productos p ON pd.producto_id = p.id
      ${whereClause}
      ORDER BY pd.id DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await db.query(sql, [...params, limit, offset]);

    res.json({
      data: rows,
      meta: { total, page, last_page: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('ERROR GET PRODUCCION:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Finalizar lote y actualizar stock en inventario
router.post('/:id/finalizar', async (req, res) => {
  const { id } = req.params;
  const { cantidad_producida } = req.body; // El usuario puede ingresar la cantidad real producida!
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [[lote]] = await connection.query('SELECT producto_id, cantidad_programada FROM produccion WHERE id = ?', [id]);
    
    if (!lote) {
      await connection.rollback();
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const cantReal = cantidad_producida || lote.cantidad_programada;

    // 1. Actualizar estado y cantidad producida en producción
    await connection.query(
      'UPDATE produccion SET estado = "COMPLETADO", cantidad_producida = ? WHERE id = ?',
      [cantReal, id]
    );

    // 2. Actualizar stock en la tabla inventario
    await connection.query(`
      INSERT INTO inventario (producto_id, stock_actual) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE stock_actual = stock_actual + ?
    `, [lote.producto_id, cantReal, cantReal]);

    // 3. Registrar movimiento de inventario
    const usuario_id = req.user?.id || 1;
    await connection.query(`
      INSERT INTO movimientos_inventario (producto_id, usuario_id, tipo_movimiento, cantidad, motivo)
      VALUES (?, ?, 'ENTRADA', ?, 'PRODUCCION')
    `, [lote.producto_id, usuario_id, cantReal]);

    await connection.commit();
    res.json({ success: true, message: 'Producción completada y stock actualizado' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR EN FINALIZAR PRODUCCION:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Crear producción manualmente
router.post('/', async (req, res) => {
  const { producto_id, fecha, cantidad_programada } = req.body;
  const usuario_id = req.user?.id || 1;

  if (!producto_id || !fecha || !cantidad_programada) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO produccion (fecha, producto_id, cantidad_programada, estado, usuario_id) VALUES (?, ?, ?, "PENDIENTE", ?)',
      [fecha, producto_id, cantidad_programada, usuario_id]
    );

    res.status(201).json({ id: result.insertId, message: 'Plan de producción creado' });
  } catch (err) {
    console.error('ERROR CREATE PRODUCCION:', err);
    res.status(500).json({ error: 'Error al crear producción' });
  }
});

// GENERAR PLAN DESDE IA
router.post('/desde-prediccion', async (req, res) => {
  const { predicciones, fecha } = req.body;
  const usuario_id = req.user?.id || 1;

  if (!predicciones || !fecha) {
    return res.status(400).json({ error: 'Datos insuficientes para generar plan' });
  }

  try {
    await db.query('DELETE FROM produccion WHERE fecha = ? AND estado = "PENDIENTE"', [fecha]);

    for (const p of predicciones) {
      let prodId = p.id_producto;
      const nombreProd = p.producto || p.name;
      const cantidad = Math.round(p.cantidad_estimada || p.value || 0);

      if (!prodId && nombreProd) {
        const [prods] = await db.query('SELECT id FROM productos WHERE LOWER(nombre) LIKE LOWER(?) LIMIT 1', [`%${nombreProd}%`]);
        if (prods.length > 0) prodId = prods[0].id;
      }

      if (prodId && cantidad > 0) {
        await db.query(
          'INSERT INTO produccion (producto_id, fecha, cantidad_programada, estado, usuario_id) VALUES (?, ?, ?, "PENDIENTE", ?)',
          [prodId, fecha, cantidad, usuario_id]
        );
      }
    }

    res.json({ success: true, message: 'Plan de producción sincronizado' });
  } catch (err) {
    console.error('ERROR SYNC PRODUCCION:', err);
    res.status(500).json({ error: 'Error al sincronizar con Producción' });
  }
});

module.exports = router;
