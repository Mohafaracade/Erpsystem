const { validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');

/**
 * Middleware to validate request against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} [source='body'] - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message.replace(/['"]/g, '')
      }));

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace request body with validated value
    req[source] = value;
    next();
  };
};

/**
 * Middleware to validate request using express-validator
 * @param {Array} validations - Array of express-validator validations
 * @returns {Array} Array of middleware functions
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorList = errors.array().map(err => ({
      field: err.param,
      location: err.location,
      message: err.msg,
      value: err.value
    }));

    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Validation error',
      errors: errorList
    });
  };
};

/**
 * Middleware to validate MongoDB ObjectId parameters
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Invalid ${paramName} format`,
        field: paramName
      });
    }
    next();
  };
};

module.exports = {
  validate,
  validateRequest,
  validateObjectId,
  validationResult
};