/**
 * Controlador de Proveedores
 * 
 * Gestiona el catálogo de empresas o personas que proveen insumos a la panadería.
 * Útil para la gestión de compras y abastecimiento de inventario.
 */
const db = require('../config/database');

/**
 * Lista los proveedores registrados.
 * Si se solicita con ?all=true, devuelve la lista sin paginar (para combos de selección).
 */
exports.getAll = async (req, res) => {
  try {
    if (req.query.all === 'true') {
      const [rows] = await db.query('SELECT id, nombre_empresa FROM proveedores WHERE estado = 1 ORDER BY nombre_empresa');
      return res.json(rows);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM proveedores WHERE estado = 1');
    const [rows] = await db.query(
      'SELECT id, nombre_empresa, ruc_dni, telefono, correo, contacto, estado, created_at FROM proveedores WHERE estado = 1 ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

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
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
};

/**
 * Registra un nuevo proveedor en el sistema.
 * Protege contra RUCs/DNIs duplicados lanzando un error 400.
 */
exports.create = async (req, res) => {
  try {
    const { nombre_empresa, ruc_dni, telefono, correo, contacto } = req.body;
    if (!nombre_empresa) return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });

    const [result] = await db.query(
      'INSERT INTO proveedores (nombre_empresa, ruc_dni, telefono, correo, contacto, estado) VALUES (?, ?, ?, ?, ?, 1)',
      [nombre_empresa, ruc_dni, telefono || null, correo || null, contacto || null]
    );

    res.json({ id: result.insertId, nombre_empresa, ruc_dni, telefono, correo, contacto, estado: 1 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El RUC/DNI ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
};

/**
 * Actualiza la información de contacto o fiscal de un proveedor existente.
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_empresa, ruc_dni, telefono, correo, contacto, estado } = req.body;
    if (!nombre_empresa) return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });

    await db.query(
      'UPDATE proveedores SET nombre_empresa = ?, ruc_dni = ?, telefono = ?, correo = ?, contacto = ?, estado = ? WHERE id = ?',
      [nombre_empresa, ruc_dni, telefono || null, correo || null, contacto || null, estado, id]
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El RUC/DNI ya está registrado en otro proveedor' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
};

/**
 * Da de baja (lógica) a un proveedor. 
 * Se mantiene en base de datos para no afectar compras previas.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('UPDATE proveedores SET estado = 0 WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
};
