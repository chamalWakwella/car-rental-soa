const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = 'dev-secret-change-me';

function signToken(payload, secret = process.env.JWT_SECRET || DEFAULT_SECRET, options = {}) {
  return jwt.sign(payload, secret, { expiresIn: '8h', ...options });
}

function verifyToken(token, secret = process.env.JWT_SECRET || DEFAULT_SECRET) {
  return jwt.verify(token, secret);
}

function authMiddleware(requiredRoles = []) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }
  res.status(status).json({ error: message });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function logger(serviceName) {
  return (req, _res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${serviceName}] ${req.method} ${req.originalUrl}`);
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  asyncHandler,
  errorHandler,
  HttpError,
  logger,
};
