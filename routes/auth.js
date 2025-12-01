import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Parishioner from '../models/Parishioner.js';
import RefreshToken from '../models/RefreshToken.js';
import { authenticate } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { validatePassword } from '../utils/passwordValidation.js';
import { validate, schemas } from '../middleware/validation.js';
import { authLogger, errorLogger } from '../utils/logger.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      userId: user._id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '15m' } // Short-lived access token
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  return { accessToken, refreshToken };
};

// Helper function to set secure cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth'
  });
};

// Login (supports both username for admin/editor and email for parishioner)
router.post('/login', loginRateLimiter, validate(schemas.login), async (req, res) => {
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
      authLogger.warn({ username, email, ip: req.ip }, 'Login attempt failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      authLogger.warn({ userId: user._id, username: user.username, email: user.email, ip: req.ip }, 'Login attempt failed: Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    authLogger.info({ userId: user._id, username: user.username, email: user.email, role: user.role, ip: req.ip }, 'Login successful');

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Delete old refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    // Save new refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt
    });

    // Set refresh token as secure HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Return access token in response body (client stores in memory/localStorage)
    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username || null,
        email: user.email || null,
        role: user.role
      }
    });
  } catch (error) {
    errorLogger.error({ err: error, ip: req.ip }, 'Login error');
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new parishioner (public) - Creates both User and Parishioner
router.post('/register', validate(schemas.register), async (req, res) => {
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

    // Validate password (parishioners: minimum 6 characters)
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
    authLogger.info({ userId: user._id, email: user.email, ip: req.ip }, 'Parishioner registered successfully');

    // Generate tokens for automatic login
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt
    });

    // Set refresh token as secure HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Send welcome message to new user
    try {
      const parishName = process.env.PARISH_NAME || 'Parish Website';
      const fullName = `${firstName} ${lastName}`;
      
      await notificationService.sendNotification({
        type: 'email',
        recipient: {
          email: user.email,
          name: fullName,
          phone: phone || undefined
        },
        subject: `Welcome to ${parishName}!`,
        message: `Dear ${firstName},\n\nWelcome to our parish community! We are delighted to have you join us.\n\nYour registration has been successfully completed. You can now:\n- Access your profile and update your information\n- View mass schedules and events\n- Participate in ministries\n- Stay connected with our parish community\n\nIf you have any questions or need assistance, please don't hesitate to contact us.\n\nMay God bless you,\n${parishName} Team`,
        htmlMessage: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Welcome to ${parishName}!</h2>
            <p>Dear ${firstName},</p>
            <p>Welcome to our parish community! We are delighted to have you join us.</p>
            <p>Your registration has been successfully completed. You can now:</p>
            <ul style="line-height: 1.8;">
              <li>Access your profile and update your information</li>
              <li>View mass schedules and events</li>
              <li>Participate in ministries</li>
              <li>Stay connected with our parish community</li>
            </ul>
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            <p style="margin-top: 30px;">May God bless you,<br><strong>${parishName} Team</strong></p>
          </div>
        `,
        metadata: {
          source: 'registration',
          userId: user._id.toString(),
          parishionerId: parishioner._id.toString()
        }
      });
    } catch (welcomeError) {
      // Log error but don't fail registration
      errorLogger.error({ 
        err: welcomeError, 
        userId: user._id, 
        email: user.email 
      }, 'Failed to send welcome email to new user');
    }
    
    res.status(201).json({ 
      message: 'Registration successful! Welcome to our parish community.',
      accessToken,
      user: {
        id: user._id,
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

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Find refresh token in database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new access token
    const { accessToken } = generateTokens(user);

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/api/auth'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password (authenticated users only)
router.post('/change-password', authenticate, validate(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password with strong rules (for admin/editor roles)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Apply strong password rules for admin and editor roles
    if (user.role === 'admin' || user.role === 'editor') {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }
    } else {
      // Parishioners: minimum 6 characters
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'New password must be at least 6 characters long' 
        });
      }
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

    // Invalidate all refresh tokens for security
    await RefreshToken.deleteMany({ userId: user._id });

    console.log('Password changed successfully:', { userId: user._id, role: user.role });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;


