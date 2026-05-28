/**
 * Middleware Global de Manejo de Errores
 * 
 * Captura excepciones no manejadas en las rutas y controladores.
 * Previene que el servidor se caiga y devuelve una respuesta HTTP 500 estandarizada
 * para no exponer detalles sensibles de la base de datos o lógica interna.
 * 
 * @param {Error} err - Error capturado
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * @param {import('express').NextFunction} next - Siguiente middleware
 */
module.exports = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
};