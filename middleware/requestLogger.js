import pinoHttp from 'pino-http';
import { requestLogger } from '../utils/logger.js';

/**
 * Request logging middleware using pino-http
 * Logs all HTTP requests with method, URL, status, response time, etc.
 */
export const httpLogger = pinoHttp({
  logger: requestLogger,
  autoLogging: {
    ignore: (req) => {
      // Ignore health check endpoints
      return req.url === '/api/health';
    }
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
  customProps: (req, res) => {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId,
      role: req.user?.role
    };
  }
});

