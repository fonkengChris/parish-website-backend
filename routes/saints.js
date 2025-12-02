import express from 'express';
import { getSaintOfTheDay, getUpcomingFeasts, getFeastsInRange } from '../utils/saintCalendar.js';

const router = express.Router();

/**
 * GET /api/saints/today
 * Get the saint(s) of the day
 */
router.get('/today', (req, res) => {
  try {
    const result = getSaintOfTheDay();
    res.json(result);
  } catch (error) {
    console.error('Error getting saint of the day:', error);
    res.status(500).json({ message: 'Error fetching saint of the day', error: error.message });
  }
});

/**
 * GET /api/saints/upcoming
 * Get upcoming feasts for the next N days
 * Query params: days (default: 9)
 */
router.get('/upcoming', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 9;
    const feasts = getUpcomingFeasts(days);
    res.json({ feasts, count: feasts.length });
  } catch (error) {
    console.error('Error getting upcoming feasts:', error);
    res.status(500).json({ message: 'Error fetching upcoming feasts', error: error.message });
  }
});

/**
 * GET /api/saints
 * Get saint of the day and upcoming feasts in one call
 * Query params: days (default: 9)
 */
router.get('/', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 9;
    const today = getSaintOfTheDay();
    const upcoming = getUpcomingFeasts(days);
    
    res.json({
      today,
      upcoming,
      count: upcoming.length
    });
  } catch (error) {
    console.error('Error getting saints data:', error);
    res.status(500).json({ message: 'Error fetching saints data', error: error.message });
  }
});

/**
 * GET /api/saints/range
 * Get feasts in a date range
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get('/range', (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required (YYYY-MM-DD)' });
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    const feasts = getFeastsInRange(startDate, endDate);
    res.json({ feasts, count: feasts.length });
  } catch (error) {
    console.error('Error getting feasts in range:', error);
    res.status(500).json({ message: 'Error fetching feasts in range', error: error.message });
  }
});

export default router;

