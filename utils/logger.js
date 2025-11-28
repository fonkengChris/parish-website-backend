import pino from 'pino';

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// Create child loggers for different contexts
export const requestLogger = logger.child({ context: 'request' });
export const errorLogger = logger.child({ context: 'error' });
export const authLogger = logger.child({ context: 'auth' });
export const dbLogger = logger.child({ context: 'database' });

export default logger;

