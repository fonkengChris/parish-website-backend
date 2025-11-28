import Joi from 'joi';

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Property to validate ('body', 'query', 'params')
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  login: Joi.object({
    username: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().required()
  }).or('username', 'email').messages({
    'object.missing': 'Either username or email is required'
  }),

  register: Joi.object({
    firstName: Joi.string().required().trim(),
    lastName: Joi.string().required().trim(),
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional().allow('', null)
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),

  // Gallery schemas
  galleryItem: Joi.object({
    title: Joi.string().required().trim(),
    imageUrl: Joi.string().uri().required(),
    eventId: Joi.string().hex().length(24).optional().allow('', null),
    category: Joi.string().optional(),
    isActive: Joi.boolean().optional()
  }),

  // Event schemas
  event: Joi.object({
    title: Joi.string().required().trim(),
    description: Joi.string().optional().allow('', null),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional().allow(null).min(Joi.ref('startDate')),
    location: Joi.string().optional().allow('', null),
    image: Joi.string().uri().optional().allow('', null),
    isActive: Joi.boolean().optional()
  }),

  // Mass schedule schemas
  massSchedule: Joi.object({
    missionStation: Joi.string().hex().length(24).required(),
    dayOfWeek: Joi.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    type: Joi.string().required(),
    description: Joi.string().optional().allow('', null),
    isActive: Joi.boolean().optional()
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
};

