import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Parishioner from '../models/Parishioner.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Login (supports both username for admin/editor and email for parishioner)
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (!username && !email) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    // Find user by username or email
    const user = username 
      ? await User.findOne({ username })
      : await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('Login attempt failed: User not found', { username, email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login attempt failed: Password mismatch', { userId: user._id, username: user.username, email: user.email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('Login successful:', { userId: user._id, username: user.username, email: user.email, role: user.role });

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new parishioner (public) - Creates both User and Parishioner
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'First name, last name, email, and password are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if email already exists in User model
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User first
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'parishioner'
    });

    await user.save();

    // Create Parishioner profile linked to User
    const parishioner = new Parishioner({
      user: user._id,
      firstName,
      lastName,
      phone: phone || undefined
    });

    await parishioner.save();

    // Update User to reference Parishioner
    user.parishioner = parishioner._id;
    await user.save();
    
    // Log successful registration
    console.log('Parishioner registered successfully:', {
      userId: user._id,
      parishionerId: parishioner._id,
      email: user.email,
      firstName: parishioner.firstName,
      lastName: parishioner.lastName
    });
    
    res.status(201).json({ 
      message: 'Registration successful! Welcome to our parish community.',
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      },
      parishioner: {
        _id: parishioner._id,
        firstName: parishioner.firstName,
        lastName: parishioner.lastName
      }
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error registering parishioner:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }
    res.status(400).json({ 
      message: 'Error registering parishioner', 
      error: error.message 
    });
  }
});

// Get parishioner profile by email (public - for profile access)
router.get('/profile/by-email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() })
      .populate('parishioner');
    
    if (!user || !user.parishioner) {
      return res.status(404).json({ message: 'Parishioner not found' });
    }

    const parishioner = await Parishioner.findById(user.parishioner)
      .populate('missionStation', 'name location')
      .populate('ministries', 'name');
    
    if (!parishioner) {
      return res.status(404).json({ message: 'Parishioner not found' });
    }
    
    res.json(parishioner);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Change password (authenticated users only)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is different from current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.passwordHash = hashedPassword;
    await user.save();

    console.log('Password changed successfully:', { userId: user._id, role: user.role });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;


