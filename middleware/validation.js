import { body, validationResult } from 'express-validator';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Caller validation rules
export const validateCaller = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must not exceed 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
  body('caller_type')
    .optional()
    .isIn(['new', 'regular', 'vip']).withMessage('Invalid caller type'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  handleValidationErrors
];

// Call validation rules
export const validateCall = [
  body('caller_id')
    .notEmpty().withMessage('Caller ID is required')
    .isUUID().withMessage('Invalid caller ID format'),
  body('topic')
    .trim()
    .notEmpty().withMessage('Topic is required')
    .isLength({ min: 3, max: 200 }).withMessage('Topic must be between 3 and 200 characters'),
  body('screener_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Screener notes must not exceed 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority level'),
  body('screener_name')
    .trim()
    .notEmpty().withMessage('Screener name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Screener name must be between 2 and 100 characters'),
  body('talking_points')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Talking points must not exceed 1000 characters'),
  handleValidationErrors
];

// Call status update validation
export const validateCallStatusUpdate = [
  body('call_status')
    .notEmpty().withMessage('Call status is required')
    .isIn(['waiting', 'ready', 'on_air', 'completed', 'dropped']).withMessage('Invalid call status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority level'),
  handleValidationErrors
];

// User registration validation
export const validateUserRegistration = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'host', 'screener']).withMessage('Invalid role'),
  handleValidationErrors
];

// User login validation
export const validateUserLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];