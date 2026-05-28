const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_jwt_secret_en_produccion';

/**
 * Middleware de Autenticación JWT
 * 
 * Intercepta las solicitudes entrantes a rutas protegidas. Verifica la presencia
 * y validez del token JWT en la cabecera `Authorization`. Si es válido, inyecta
 * la información del usuario (`req.user`) para que esté disponible en los controladores.
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * @param {import('express').NextFunction} next - Siguiente función en el ciclo de middleware
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesión requerida' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { requireAuth };
