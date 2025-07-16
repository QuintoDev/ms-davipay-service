const { verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const response = require('../utils/response');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.error(res, 'UNAUTHORIZED', 'Token no proporcionado', {}, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid or expired token');
    return response.error(res, 'INVALID_TOKEN', 'Token inválido o expirado', {}, 401);
  }
};
