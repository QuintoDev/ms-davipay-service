const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'davipay-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
