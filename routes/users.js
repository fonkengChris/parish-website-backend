import express from 'express';
import User from '../models/User.js';
import { authenticate, requireAdminOrParishPriest } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin/parish-priest only)
router.get('/', authenticate, requireAdminOrParishPriest, async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .populate('parishioner', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single user by ID (admin/parish-priest only)
router.get('/:id', authenticate, requireAdminOrParishPriest, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('parishioner', 'firstName lastName email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role (admin/parish-priest only)
router.put('/:id/role', authenticate, requireAdminOrParishPriest, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    
    const validRoles = ['admin', 'editor', 'priest', 'parish-priest', 'parishioner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Prevent users from changing their own role (security measure)
    if (req.user.userId === req.params.id) {
      return res.status(403).json({ message: 'You cannot change your own role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user role', error: error.message });
  }
});

export default router;

