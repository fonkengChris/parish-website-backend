import express from 'express';
import Ministry from '../models/Ministry.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all active ministries (public)
router.get('/', async (req, res) => {
  try {
    const ministries = await Ministry.find({ isActive: true })
      .sort({ name: 1 });
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all ministries (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const ministries = await Ministry.find().sort({ name: 1 });
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single ministry
router.get('/:id', async (req, res) => {
  try {
    const ministry = await Ministry.findById(req.params.id);
    if (!ministry) {
      return res.status(404).json({ message: 'Ministry not found' });
    }
    res.json(ministry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create ministry (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const ministry = new Ministry(req.body);
    await ministry.save();
    res.status(201).json(ministry);
  } catch (error) {
    res.status(400).json({ message: 'Error creating ministry', error: error.message });
  }
});

// Update ministry (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const ministry = await Ministry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ministry) {
      return res.status(404).json({ message: 'Ministry not found' });
    }
    res.json(ministry);
  } catch (error) {
    res.status(400).json({ message: 'Error updating ministry', error: error.message });
  }
});

// Delete ministry (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const ministry = await Ministry.findByIdAndDelete(req.params.id);
    if (!ministry) {
      return res.status(404).json({ message: 'Ministry not found' });
    }
    res.json({ message: 'Ministry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;


