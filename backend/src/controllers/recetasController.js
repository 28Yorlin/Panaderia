/**
 * Controlador de Recetas y Fórmulas
 * 
 * Gestiona el maestro de recetas de panadería. Relaciona un producto final 
 * con los insumos (materia prima) necesarios para su producción.
 * Fundamental para proyectar compras y calcular costos de fabricación.
 */
const db = require('../config/database');

/**
 * Recupera el listado general de recetas.
 * Incluye paginación y permite búsqueda rápida por nombre.
 */
exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM recetas';
    let countQuery = 'SELECT COUNT(*) as total FROM recetas';
    let params = [];
    let countParams = [];

    if (search) {
      query += ' WHERE nombre_receta LIKE ?';
      countQuery += ' WHERE nombre_receta LIKE ?';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
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
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
};

/**
 * Consulta el detalle exacto de una receta específica (Ingredientes y Cantidades).
 * Realiza un JOIN con la tabla de insumos para devolver la unidad de medida correspondiente.
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [recetaRows] = await db.query('SELECT * FROM recetas WHERE id = ?', [id]);
    if (recetaRows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const [rows] = await db.query(`
      SELECT rd.insumo_id as id_insumo, i.nombre as insumo, i.unidad_medida, rd.cantidad_requerida as cantidad_necesaria
      FROM recetas_detalle rd
      JOIN insumos i ON rd.insumo_id = i.id
      WHERE rd.receta_id = ?
    `, [id]);
    
    res.json({
      ...recetaRows[0],
      insumos: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle de receta' });
  }
};

/**
 * Crea una nueva receta e inserta sus ingredientes en la tabla pivote `recetas_detalle`.
 * Operación asíncrona pero sin transacción estricta (podría mejorarse a futuro si la receta crece).
 */
exports.create = async (req, res) => {
  try {
    const { nombre_receta, descripcion, insumos } = req.body;

    const [result] = await db.query(
      'INSERT INTO recetas (nombre_receta, descripcion) VALUES (?, ?)',
      [nombre_receta, descripcion]
    );
    const receta_id = result.insertId;

    if (insumos && insumos.length > 0) {
      const values = insumos.map(i => [receta_id, i.id_insumo, i.cantidad_necesaria]);
      await db.query('INSERT INTO recetas_detalle (receta_id, insumo_id, cantidad_requerida) VALUES ?', [values]);
    }
    
    res.json({ success: true, id: receta_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar receta' });
  }
};

/**
 * Actualiza la descripción de una receta.
 * Por simplicidad, elimina todos los detalles previos y los vuelve a insertar limpios.
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_receta, descripcion, insumos } = req.body;

    await db.query(
      'UPDATE recetas SET nombre_receta = ?, descripcion = ? WHERE id = ?',
      [nombre_receta, descripcion, id]
    );

    // Borrar detalles antiguos
    await db.query('DELETE FROM recetas_detalle WHERE receta_id = ?', [id]);

    // Insertar nuevos detalles
    if (insumos && insumos.length > 0) {
      const values = insumos.map(i => [id, i.id_insumo, i.cantidad_necesaria]);
      await db.query('INSERT INTO recetas_detalle (receta_id, insumo_id, cantidad_requerida) VALUES ?', [values]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar receta' });
  }
};

// Obtener por producto (mantenemos compatibilidad por si acaso)
exports.getByProducto = async (req, res) => {
  try {
    const { id_producto } = req.params;
    
    const [prodRows] = await db.query('SELECT receta_id FROM productos WHERE id = ?', [id_producto]);
    if (prodRows.length === 0 || !prodRows[0].receta_id) {
      return res.json([]);
    }

    const [rows] = await db.query(`
      SELECT rd.insumo_id as id_insumo, i.nombre as insumo, i.unidad_medida, rd.cantidad_requerida as cantidad_necesaria
      FROM recetas_detalle rd
      JOIN insumos i ON rd.insumo_id = i.id
      WHERE rd.receta_id = ?
    `, [prodRows[0].receta_id]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};
