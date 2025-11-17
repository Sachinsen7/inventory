/**
 * Simple logger utility to gate debug logs and redact sensitive data
 * Usage: 
 *   logger.info('message')
 *   logger.debug('debug message') - only logs in development
 *   logger.error('error message', error)
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Log info level messages (always shown)
   */
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] INFO: ${message}`, data);
    } else {
      console.log(`[${timestamp}] INFO: ${message}`);
    }
  },

  /**
   * Log debug level messages (development only)
   */
  debug: (message, data = null) => {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] DEBUG: ${message}`, data);
      } else {
        console.log(`[${timestamp}] DEBUG: ${message}`);
      }
    }
  },

  /**
   * Log error level messages with optional error object
   * Redacts sensitive information in development, minimal info in production
   */
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    
    if (error) {
      if (isDevelopment) {
        // In development, log full error details for debugging
        console.error(`Stack: ${error.stack}`);
        if (error.message) {
          console.error(`Message: ${error.message}`);
        }
      } else {
        // In production, log minimal error info
        console.error(`Code: ${error.code || 'UNKNOWN'}`);
      }
    }
  },

  /**
   * Log warnings
   */
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.warn(`[${timestamp}] WARN: ${message}`, data);
    } else {
      console.warn(`[${timestamp}] WARN: ${message}`);
    }
  },
};

module.exports = logger;
