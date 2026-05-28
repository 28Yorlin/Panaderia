/**
 * Controlador de Roles y Accesos
 * 
 * Gestiona los perfiles de seguridad del sistema (Ej. Administrador, Vendedor, Cajero).
 * Permite definir qué módulos puede ver o modificar cada perfil a través de la columna `permisos`.
 */
const db = require('../config/database');

/**
 * Lista todos los roles creados en el sistema.
 */
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM roles ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea un nuevo rol sin permisos preasignados.
 */
exports.create = async (req, res) => {
  const { nombre } = req.body;
  try {
    const [result] = await db.query('INSERT INTO roles (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ id: result.insertId, message: 'Rol creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza el nombre del rol o la matriz de permisos serializada.
 */
exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, permisos } = req.body;
  try {
    if (permisos !== undefined) {
      await db.query('UPDATE roles SET nombre = ?, permisos = ? WHERE id = ?', [nombre, permisos, id]);
    } else {
      await db.query('UPDATE roles SET nombre = ? WHERE id = ?', [nombre, id]);
    }
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina físicamente un rol de la base de datos. 
 * (Nota: Podría fallar si existen usuarios asignados a este rol por reglas de Foreign Key).
 */
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Rol eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
