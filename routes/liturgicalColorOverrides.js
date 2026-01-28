import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import LiturgicalColorOverride from '../models/LiturgicalColorOverride.js';
import { LITURGICAL_COLORS } from '../utils/liturgicalCalendar.js';

const router = express.Router();

// Handle OPTIONS requests for CORS preflight (before authentication)
router.options('*', (req, res) => {
  res.sendStatus(200);
});

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/liturgical-color-overrides
 * Get all color overrides (with pagination)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const overrides = await LiturgicalColorOverride.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username email')
      .lean();

    const total = await LiturgicalColorOverride.countDocuments();

    res.json({
      overrides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching color overrides:', error);
    res.status(500).json({ 
      message: 'Error retrieving color overrides',
      error: error.message 
    });
  }
});

/**
 * GET /api/liturgical-color-overrides/:date
 * Get color override for a specific date
 */
router.get('/:date', [
  param('date').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);

    const override = await LiturgicalColorOverride.findOne({ date })
      .populate('createdBy', 'username email')
      .lean();

    if (!override) {
      return res.status(404).json({ message: 'No override found for this date' });
    }

    res.json(override);
  } catch (error) {
    console.error('Error fetching color override:', error);
    res.status(500).json({ 
      message: 'Error retrieving color override',
      error: error.message 
    });
  }
});

/**
 * POST /api/liturgical-color-overrides
 * Create a new color override
 */
router.post('/', [
  body('date').isISO8601().withMessage('Invalid date format'),
  body('color').isIn(['white', 'red', 'green', 'purple', 'rose', 'gold']).withMessage('Invalid color'),
  body('reason').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, color, reason } = req.body;
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if override already exists
    const existing = await LiturgicalColorOverride.findOne({ date: dateObj });
    if (existing) {
      return res.status(409).json({ 
        message: 'Override already exists for this date. Use PUT to update.' 
      });
    }

    const override = new LiturgicalColorOverride({
      date: dateObj,
      color,
      reason: reason || '',
      createdBy: req.user.userId
    });

    await override.save();
    await override.populate('createdBy', 'username email');

    res.status(201).json(override);
  } catch (error) {
    console.error('Error creating color override:', error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Override already exists for this date' 
      });
    }
    res.status(500).json({ 
      message: 'Error creating color override',
      error: error.message 
    });
  }
});

/**
 * PUT /api/liturgical-color-overrides/:date
 * Update an existing color override
 */
router.put('/:date', [
  param('date').isISO8601().withMessage('Invalid date format'),
  body('color').isIn(['white', 'red', 'green', 'purple', 'rose', 'gold']).withMessage('Invalid color'),
  body('reason').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);

    const { color, reason } = req.body;

    const override = await LiturgicalColorOverride.findOne({ date });
    if (!override) {
      return res.status(404).json({ message: 'Override not found for this date' });
    }

    override.color = color;
    if (reason !== undefined) {
      override.reason = reason || '';
    }

    await override.save();
    await override.populate('createdBy', 'username email');

    res.json(override);
  } catch (error) {
    console.error('Error updating color override:', error);
    res.status(500).json({ 
      message: 'Error updating color override',
      error: error.message 
    });
  }
});

/**
 * DELETE /api/liturgical-color-overrides/:date
 * Delete a color override
 */
router.delete('/:date', [
  param('date').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);

    const override = await LiturgicalColorOverride.findOneAndDelete({ date });
    if (!override) {
      return res.status(404).json({ message: 'Override not found for this date' });
    }

    res.json({ message: 'Override deleted successfully' });
  } catch (error) {
    console.error('Error deleting color override:', error);
    res.status(500).json({ 
      message: 'Error deleting color override',
      error: error.message 
    });
  }
});

export default router;

