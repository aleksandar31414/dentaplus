const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/http');

const secret = () => process.env.JWT_SECRET || 'dev-secret-change-me';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Requires a valid JWT. Sets req.user = { _id, username, email, role }. */
function authenticate(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(new HttpError(401, 'Потребна е најава (JWT токен)'));
  try {
    req.user = jwt.verify(token, secret());
    return next();
  } catch (err) {
    return next(new HttpError(401, 'Невалиден или истечен токен'));
  }
}

/** Sets req.user if a valid token is present, but lets guests through. */
function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, secret());
    } catch (_) {
      /* treat as guest */
    }
  }
  next();
}

/** Role based authorization. Usage: authorize('admin') */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Потребна е најава'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Немате дозвола за оваа акција'));
  return next();
};

/** True if the logged-in user owns the document or is admin. */
const canModify = (user, ownerId) =>
  !!user && (user.role === 'admin' || String(ownerId?._id || ownerId) === String(user._id));

module.exports = { authenticate, optionalAuth, authorize, canModify };
