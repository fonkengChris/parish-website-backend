import express from 'express';
import Prayer from '../models/Prayer.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all active prayers (public)
router.get('/', async (req, res) => {
  try {
    const prayers = await Prayer.find({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(prayers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all prayers (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const prayers = await Prayer.find().sort({ createdAt: -1 });
    res.json(prayers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single prayer
router.get('/:id', async (req, res) => {
  try {
    const prayer = await Prayer.findById(req.params.id);
    if (!prayer) {
      return res.status(404).json({ message: 'Prayer not found' });
    }
    res.json(prayer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create prayer (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const prayer = new Prayer(req.body);
    await prayer.save();
    res.status(201).json(prayer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating prayer', error: error.message });
  }
});

// Update prayer (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const prayer = await Prayer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!prayer) {
      return res.status(404).json({ message: 'Prayer not found' });
    }
    res.json(prayer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating prayer', error: error.message });
  }
});

// Delete prayer (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const prayer = await Prayer.findByIdAndDelete(req.params.id);
    if (!prayer) {
      return res.status(404).json({ message: 'Prayer not found' });
    }
    res.json({ message: 'Prayer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

