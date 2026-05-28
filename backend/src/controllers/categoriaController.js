/**
 * Controlador de Categorías
 * 
 * Gestiona el catálogo de categorías para la clasificación de productos.
 * Expone un CRUD básico con opciones de paginación o listado completo 
 * (útil para selects/combobox en el frontend).
 */
const db = require('../config/database');

/**
 * Obtiene todas las categorías registradas.
 * Soporta el parámetro `?all=true` para omitir la paginación.
 */
exports.getAll = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseQuery = `
      SELECT id, nombre, descripcion
      FROM categorias
      WHERE 1=1
    `;

    if (isAll) {
      const [rows] = await db.query(`${baseQuery} ORDER BY nombre`);
      return res.json(rows);
    }

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM categorias');

    const [rows] = await db.query(`
      ${baseQuery}
      ORDER BY nombre
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
    console.error('ERROR EN GET ALL CATEGORIAS:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Obtener categoría por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ? AND estado = 1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('ERROR EN GET BY ID CATEGORIA:', err);
    res.status(500).json({ error: 'Error al obtener categoría' });
  }
};

/**
 * Crea una nueva categoría.
 * Valida que el nombre no venga vacío para mantener la integridad de los datos.
 */
exports.create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const [result] = await db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );

    res.status(201).json({ id: result.insertId, message: 'Categoría creada' });
  } catch (err) {
    console.error('ERROR EN CREATE CATEGORIA:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

/**
 * Sobrescribe los datos de una categoría existente.
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const [result] = await db.query(
      'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    console.error('ERROR EN UPDATE CATEGORIA:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

/**
 * Elimina una categoría del sistema (Baja lógica).
 * Se actualiza el `estado = 0` para evitar romper las referencias de los productos existentes.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'UPDATE categorias SET estado = 0 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error('ERROR EN REMOVE CATEGORIA:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};
