import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parish-website');
    console.log('Connected to MongoDB');

    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`User ${username} already exists`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const user = new User({
      username,
      passwordHash,
      role: 'admin'
    });

    await user.save();
    console.log(`Admin user created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\nPlease change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();


