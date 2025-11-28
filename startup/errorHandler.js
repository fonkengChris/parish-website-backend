import { errorLogger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error with context
  errorLogger.error({
    err,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
    role: req.user?.role,
    body: req.body,
    query: req.query,
    params: req.params
  }, 'Request error');

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Validation error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.details.map(detail => detail.message)
    });
  }

  // Custom application errors with status code
  if (err.status) {
    return res.status(err.status).json({
      message: err.message || 'Error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Default 500 error
  res.status(500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

