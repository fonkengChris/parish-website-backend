import express from 'express';
import MissionStation from '../models/MissionStation.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all active mission stations (public)
router.get('/', async (req, res) => {
  try {
    const stations = await MissionStation.find({ isActive: true })
      .sort({ name: 1 });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all mission stations (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const stations = await MissionStation.find().sort({ name: 1 });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single mission station
router.get('/:id', async (req, res) => {
  try {
    const station = await MissionStation.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: 'Mission station not found' });
    }
    res.json(station);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create mission station (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const station = new MissionStation(req.body);
    await station.save();
    res.status(201).json(station);
  } catch (error) {
    res.status(400).json({ message: 'Error creating mission station', error: error.message });
  }
});

// Update mission station (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const station = await MissionStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!station) {
      return res.status(404).json({ message: 'Mission station not found' });
    }
    res.json(station);
  } catch (error) {
    res.status(400).json({ message: 'Error updating mission station', error: error.message });
  }
});

// Delete mission station (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const station = await MissionStation.findByIdAndDelete(req.params.id);
    if (!station) {
      return res.status(404).json({ message: 'Mission station not found' });
    }
    res.json({ message: 'Mission station deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

