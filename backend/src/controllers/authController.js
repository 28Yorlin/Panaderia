/**
 * Controlador de Autenticación y Seguridad
 * 
 * Se encarga de validar el acceso al sistema mediante validación de credenciales
 * (con Bcrypt) y de la generación de tokens JWT para mantener sesiones seguras.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { registrarAuditoria } = require('../utils/auditoria');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_jwt_secret_en_produccion';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Valida las credenciales del usuario y genera una sesión (Login).
 * Protege contra inyecciones SQL y realiza auditoría del acceso exitoso.
 * 
 * @param {Object} req - HTTP request con email o username, y password.
 * @param {Object} res - HTTP response devolviendo el Token JWT firmado.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const identifier = email.trim().toLowerCase();
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.username, u.email, u.password, u.rol_id, u.estado, r.permisos
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id
       WHERE LOWER(TRIM(u.email)) = ? OR LOWER(TRIM(u.username)) = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length || !rows[0].estado) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const u = rows[0];
    let ok = false;
    try {
      ok = await bcrypt.compare(password, u.password);
    } catch (err) {
      ok = false;
    }

    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const payload = {
      id: u.id,
      email: u.email,
      id_rol: u.rol_id,
      nombre: u.nombre,
      username: u.username,
      permisos: u.permisos
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Registrar en auditoría
    await registrarAuditoria(u.id, 'LOGIN', 'usuarios', `Usuario @${u.username} inició sesión`, req.ip);

    res.json({
      token,
      user: { id: u.id, nombre: u.nombre, username: u.username, email: u.email, id_rol: u.rol_id, permisos: u.permisos },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

/**
 * Retorna los datos de sesión del usuario logueado usando su token JWT activo.
 * Usado comúnmente al recargar la página para mantener al usuario activo sin volver a pedir login.
 */
exports.me = (req, res) => {
  const { id, nombre, username, email, id_rol, permisos } = req.user;
  res.json({ user: { id, nombre, username, email, id_rol, permisos } });
};
