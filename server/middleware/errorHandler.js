const mongoose = require('mongoose');

/** 404 for unknown /api routes */
function apiNotFound(req, res) {
  res.status(404).json({ status: 404, message: `Не постои крајна точка ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler – converts every error into a consistent JSON response:
 * { status, message, errors? }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Внатрешна грешка на серверот';
  let errors = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Податоците не се валидни';
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Невалидна вредност за полето „${err.path}“`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'поле';
    message = `Вредноста за „${field}“ веќе постои`;
    errors = { [field]: message };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Невалиден JSON во барањето';
  }

  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ status, message, ...(errors ? { errors } : {}) });
}

module.exports = { apiNotFound, errorHandler };
