import express from 'express';
import { getTodayLiturgicalColor, getLiturgicalColor, setOverrideModel } from '../utils/liturgicalCalendar.js';
import LiturgicalColorOverride from '../models/LiturgicalColorOverride.js';

// Set the override model in the liturgical calendar utility
setOverrideModel(LiturgicalColorOverride);

const router = express.Router();

/**
 * GET /api/liturgical-color
 * Get the liturgical color for today
 */
router.get('/', async (req, res) => {
  try {
    const colorInfo = await getTodayLiturgicalColor();
    res.json(colorInfo);
  } catch (error) {
    console.error('Error getting liturgical color:', error);
    res.status(500).json({ 
      message: 'Error retrieving liturgical color',
      error: error.message 
    });
  }
});

/**
 * GET /api/liturgical-color/:date
 * Get the liturgical color for a specific date (YYYY-MM-DD format)
 */
router.get('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    const color = await getLiturgicalColor(date);
    res.json({
      color: color.name,
      hex: color.hex,
      tailwind: color.tailwind,
      date: dateStr,
      timestamp: date.toISOString()
    });
  } catch (error) {
    console.error('Error getting liturgical color:', error);
    res.status(500).json({ 
      message: 'Error retrieving liturgical color',
      error: error.message 
    });
  }
});

export default router;

