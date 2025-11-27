import express from 'express';
import MassSchedule from '../models/MassSchedule.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all active schedules (public)
router.get('/', async (req, res) => {
  try {
    const { missionStation } = req.query;
    const query = { isActive: true };
    if (missionStation) {
      query.missionStation = missionStation;
    }
    const schedules = await MassSchedule.find(query)
      .populate('missionStation', 'name location')
      .sort({ dayOfWeek: 1, time: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all schedules (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedules = await MassSchedule.find()
      .populate('missionStation', 'name location')
      .sort({ dayOfWeek: 1, time: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single schedule
router.get('/:id', async (req, res) => {
  try {
    const schedule = await MassSchedule.findById(req.params.id)
      .populate('missionStation', 'name location');
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create schedule (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = new MassSchedule(req.body);
    await schedule.save();
    await schedule.populate('missionStation', 'name location');
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ message: 'Error creating schedule', error: error.message });
  }
});

// Update schedule (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await MassSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('missionStation', 'name location');
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: 'Error updating schedule', error: error.message });
  }
});

// Delete schedule (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await MassSchedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;


