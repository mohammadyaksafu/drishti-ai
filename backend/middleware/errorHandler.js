/* eslint-disable no-unused-vars */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  if (err.code === 11000) {
    status = 409;
    message = `That ${Object.keys(err.keyValue).join(', ')} is already registered`;
  }
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Your session is invalid. Sign in again.';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session expired. Sign in again.';
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'That image is larger than 8 MB. Choose a smaller file.';
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500) console.error('[error]', err);

  res.status(status).json({ success: false, message });
}

/** Wraps async controllers so rejected promises reach errorHandler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { notFound, errorHandler, asyncHandler, ApiError };
