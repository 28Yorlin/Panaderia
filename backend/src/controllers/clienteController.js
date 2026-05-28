/**
 * Controlador de Clientes
 * 
 * Permite gestionar la cartera de clientes de la panadería.
 * Incluye validaciones para evitar duplicidad de documentos de identidad (DNI/RUC)
 * y soporta bajas lógicas para preservar el historial de ventas.
 */
const db = require('../config/database');

/**
 * Retorna el listado de clientes.
 * Proporciona soporte para paginación y búsqueda multicampo (nombre, DNI, teléfono).
 */
exports.getAll = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const estado = req.query.estado;

    let query = 'SELECT * FROM clientes WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM clientes WHERE 1=1';
    let params = [];
    let countParams = [];

    // Filtro de estado por defecto o específico
    if (estado !== undefined) {
      query += ' AND estado = ?';
      countQuery += ' AND estado = ?';
      params.push(estado);
      countParams.push(estado);
    } else {
      query += ' AND estado = 1';
      countQuery += ' AND estado = 1';
    }

    // Buscador
    if (search) {
      const searchClause = ' AND (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR telefono LIKE ? OR correo LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const [[{ total }]] = await db.query(countQuery, countParams);
    
    if (isAll) {
      const [rows] = await db.query(`${query} ORDER BY nombre`, params);
      return res.json({ data: rows });
    } else {
      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      const [rows] = await db.query(query, params);
      
      res.json({
        data: rows,
        meta: {
          total,
          page,
          last_page: Math.ceil(total / limit)
        }
      });
    }
  } catch (err) {
    console.error('ERROR EN GET ALL CLIENTES:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

/**
 * Registra un nuevo cliente en el sistema.
 * Atrapa errores de duplicidad a nivel de base de datos (`ER_DUP_ENTRY`)
 * para avisar al usuario si el DNI o RUC ya existe.
 */
exports.create = async (req, res) => {
  try {
    const { nombre, apellido, dni, ruc, razon_social, telefono, correo, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const [result] = await db.query(
      `INSERT INTO clientes (
        nombre, apellido, dni, ruc, razon_social, telefono, correo, direccion, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre, apellido || null, dni || null, ruc || null, 
        razon_social || null, telefono || null, correo || null, direccion || null
      ]
    );

    res.json({ id: result.insertId, success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El DNI o RUC ya está registrado' });
    }
    console.error('ERROR EN CREATE CLIENTE:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

/**
 * Actualiza los datos personales o de contacto de un cliente existente.
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, ruc, razon_social, telefono, correo, direccion, estado } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    await db.query(
      `UPDATE clientes SET 
        nombre = ?, apellido = ?, dni = ?, ruc = ?, 
        razon_social = ?, telefono = ?, correo = ?, 
        direccion = ?, estado = ? 
      WHERE id = ?`,
      [
        nombre, apellido || null, dni || null, ruc || null, 
        razon_social || null, telefono || null, correo || null, 
        direccion || null, estado, id
      ]
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El DNI o RUC ya está registrado en otro cliente' });
    }
    console.error('ERROR EN UPDATE CLIENTE:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

/**
 * Oculta un cliente del sistema (Baja Lógica).
 * Las ventas históricas vinculadas a este cliente seguirán existiendo intactas.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE clientes SET estado = 0 WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('ERROR EN REMOVE CLIENTE:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};
