// @ts-nocheck
const jwt = require('jsonwebtoken');

/**
 * Protect: ensures the request is authenticated (valid JWT).
 * Attaches req.user = { id, role }.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Authorize: restricts access to given role(s).
 * Use after protect. role can be a string ('admin') or array (['admin', 'owner']).
 */
const authorize = (...allowedRoles) => {
  const roles = allowedRoles.length === 1 && Array.isArray(allowedRoles[0])
    ? allowedRoles[0]
    : allowedRoles;
  const set = new Set(roles);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!set.has(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    return next();
  };
};

/** @deprecated Use protect instead */
const authMiddleware = protect;

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
};

module.exports = protect;
module.exports.protect = protect;
module.exports.authorize = authorize;
module.exports.requireAdmin = requireAdmin;
module.exports.authMiddleware = authMiddleware;

