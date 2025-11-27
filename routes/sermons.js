import express from 'express';
import Sermon from '../models/Sermon.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all active sermons and catechisis (public)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type && (type === 'sermon' || type === 'catechisis')) {
      query.type = type;
    }
    const sermons = await Sermon.find(query)
      .sort({ date: -1 })
      .limit(50);
    res.json(sermons);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all sermons and catechisis (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type && (type === 'sermon' || type === 'catechisis')) {
      query.type = type;
    }
    const sermons = await Sermon.find(query).sort({ date: -1 });
    res.json(sermons);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single sermon
router.get('/:id', async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    res.json(sermon);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create sermon (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const sermon = new Sermon(req.body);
    await sermon.save();
    res.status(201).json(sermon);
  } catch (error) {
    res.status(400).json({ message: 'Error creating sermon', error: error.message });
  }
});

// Update sermon (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const sermon = await Sermon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    res.json(sermon);
  } catch (error) {
    res.status(400).json({ message: 'Error updating sermon', error: error.message });
  }
});

// Delete sermon (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const sermon = await Sermon.findByIdAndDelete(req.params.id);
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    res.json({ message: 'Sermon deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

