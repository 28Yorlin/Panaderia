/**
 * Controlador de Insumos (Materia Prima)
 * 
 * Gestiona el catálogo de insumos utilizados para la producción de pan (Harina, Levadura, etc).
 * Provee un CRUD para mantener actualizado el inventario base y los costos unitarios.
 */
const db = require('../config/database');

/**
 * Retorna la lista de insumos.
 * Soporta paginación y modo "all=true" para llenar selectores desplegables en el Frontend.
 */
exports.getAll = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (isAll) {
      try {
        const [rows] = await db.query('SELECT * FROM insumos');
        return res.json(rows);
      } catch (err) {
        console.error("Error query insumos:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM insumos');
    const [rows] = await db.query(
      'SELECT * FROM insumos ORDER BY nombre LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      data: rows,
      total,
      page,
      lastPage: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error en getAll insumos:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ingresa un nuevo insumo al catálogo de materias primas.
 */
exports.create = async (req, res) => {
  try {
    const { nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario } = req.body;
    const [result] = await db.query(
      'INSERT INTO insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario) VALUES (?, ?, ?, ?, ?)',
      [nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario]
    );

    res.json({ message: 'Insumo creado' });
  } catch (error) {
    console.error("Error en create insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Modifica los datos de un insumo, como su unidad de medida, stock mínimo de alerta
 * o actualización de precios de costo.
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario } = req.body;
    await db.query(
      'UPDATE insumos SET nombre=?, unidad_medida=?, stock_actual=?, stock_minimo=?, costo_unitario=? WHERE id=?',
      [nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario, id]
    );

    res.json({ message: 'Insumo actualizado' });
  } catch (error) {
    console.error("Error en update insumo:", error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Da de baja (estado inactivo) a un insumo que ya no se utiliza.
 * Se evita el DELETE para conservar integridad de compras pasadas.
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query('UPDATE insumos SET estado = 0 WHERE id = ?', [id]);

    res.json({ message: 'Insumo eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
