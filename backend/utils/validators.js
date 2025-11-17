/**
 * Reusable express-validator chains for common validation patterns
 * Helps ensure strict input validation across all POST/PUT endpoints
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Common validators
 */
const validators = {
  /**
   * Validate email format and normalize
   */
  email: () => body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),

  /**
   * Validate password (min 6 chars)
   */
  password: () => body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  /**
   * Validate string field (non-empty, max length optional)
   */
  string: (field, maxLength = 500) => 
    body(field).isString().trim().notEmpty().isLength({ max: maxLength }).withMessage(`${field} must be a string (max ${maxLength} chars)`),

  /**
   * Validate number field
   */
  number: (field) => 
    body(field).isNumeric().withMessage(`${field} must be a number`),

  /**
   * Validate MongoDB ObjectId
   */
  objectId: (field) =>
    body(field).isMongoId().withMessage(`${field} must be a valid MongoDB ID`),

  /**
   * Validate phone number (basic: digits, spaces, dashes)
   */
  phone: (field) =>
    body(field).matches(/^[0-9\s\-\+\(\)]+$/).isLength({ min: 10 }).withMessage(`${field} must be a valid phone number`),

  /**
   * Validate GST number (Indian GST format: 15 alphanumeric chars)
   */
  gstNo: (field) =>
    body(field).optional().matches(/^[0-9A-Z]{15}$/).withMessage(`${field} must be a valid GST number`),

  /**
   * Validate quantity (positive integer)
   */
  quantity: (field) =>
    body(field).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`),

  /**
   * Validate price (positive number, up to 2 decimals)
   */
  price: (field) =>
    body(field).isFloat({ min: 0, max: 9999999.99 }).withMessage(`${field} must be a valid price`),

  /**
   * Validate choice from enum
   */
  enum: (field, values) =>
    body(field).isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`),

  /**
   * Middleware to handle validation errors and return 400
   */
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorList = errors.array().map(e => ({ field: e.param, message: e.msg }));
      return res.status(400).json({
        message: 'Validation failed',
        errors: errorList
      });
    }
    next();
  },

  /**
   * Middleware to reject requests with unknown fields in req.body
   * Pass an array of allowed field names
   */
  rejectUnknownFields: (allowedFields) => {
    return (req, res, next) => {
      const bodyKeys = Object.keys(req.body || {});
      const unknownFields = bodyKeys.filter(key => !allowedFields.includes(key));
      if (unknownFields.length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'request', message: `Unknown fields: ${unknownFields.join(', ')}` }]
        });
      }
      next();
    };
  }
};

module.exports = validators;
