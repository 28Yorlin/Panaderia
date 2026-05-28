const db = require('../config/database');

/**
 * Registra una acción en la tabla de auditoría.
 * @param {number|null} usuario_id - ID del usuario que realiza la acción (null si es el sistema o no logueado).
 * @param {string} accion - Tipo de acción (LOGIN, INSERT, UPDATE, DELETE).
 * @param {string|null} tabla_afectada - Nombre de la tabla afectada.
 * @param {string|null} descripcion - Descripción detallada de la acción.
 * @param {string|null} ip_address - IP desde donde se realiza la acción.
 */
async function registrarAuditoria(usuario_id, accion, tabla_afectada = null, descripcion = null, ip_address = null) {
  try {
    await db.query(
      `INSERT INTO auditoria (usuario_id, accion, tabla_afectada, descripcion, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, accion, tabla_afectada, descripcion, ip_address]
    );
  } catch (err) {
    console.error('[Auditoria] Error al registrar log:', err.message);
  }
}

module.exports = { registrarAuditoria };
