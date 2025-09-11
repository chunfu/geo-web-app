import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Winston logger configuration
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Separate file for errors only
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Separate file for scraping operations
    new winston.transports.File({
      filename: path.join(logDir, 'scraping.log'),
      maxsize: 10485760, // 10MB (larger for scraping logs)
      maxFiles: 10,
    })
  ]
});

// Custom logger interface
interface LoggerInterface {
  info(method: string, message: string, detail?: Record<string, unknown>): void;
  error(method: string, message: string, detail?: Record<string, unknown>): void;
  warn(method: string, message: string, detail?: Record<string, unknown>): void;
  debug(method: string, message: string, detail?: Record<string, unknown>): void;
}

// Logger wrapper class
class Logger implements LoggerInterface {
  private winston: winston.Logger;

  constructor(winstonLogger: winston.Logger) {
    this.winston = winstonLogger;
  }

  private formatLogData(method: string, message: string, detail?: Record<string, unknown>) {
    return {
      method,
      message,
      ...detail,
      timestamp: new Date().toISOString()
    };
  }

  info(method: string, message: string, detail?: Record<string, unknown>): void {
    const logData = this.formatLogData(method, message, detail);
    this.winston.info(logData);
  }

  error(method: string, message: string, detail?: Record<string, unknown>): void {
    const logData = this.formatLogData(method, message, detail);
    this.winston.error(logData);
  }

  warn(method: string, message: string, detail?: Record<string, unknown>): void {
    const logData = this.formatLogData(method, message, detail);
    this.winston.warn(logData);
  }

  debug(method: string, message: string, detail?: Record<string, unknown>): void {
    const logData = this.formatLogData(method, message, detail);
    this.winston.debug(logData);
  }
}

// Create and export the logger instance
export const logger = new Logger(winstonLogger);

// Export the logger interface for type checking
export type { LoggerInterface };
