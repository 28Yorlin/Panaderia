const db = require('../config/database');

/**
 * Garantiza una fila en calendario para la fecha (ventas, predicciones y vista ML la necesitan).
 * Adaptado a la nueva estructura de la base de datos (dia_semana como INT y temporada_id).
 */
async function ensureCalendarioRow(fechaStr) {
  await db.query(
    `INSERT IGNORE INTO calendario (fecha, dia_semana, es_feriado, temporada_id, evento_especial)
     VALUES (
       ?,
       DAYOFWEEK(?), -- Retorna 1 (Domingo) a 7 (Sábado)
       FALSE,
       NULL, -- Dejamos en NULL ya que no podemos adivinar el ID de la temporada fácilmente
       NULL
     )`,
    [fechaStr, fechaStr]
  );
}

module.exports = { ensureCalendarioRow };
