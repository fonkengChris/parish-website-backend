import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Parishioner from '../models/Parishioner.js';

dotenv.config();

const checkParishioners = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parish-website';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Collection name: parishioners\n');

    // Count all parishioners
    const count = await Parishioner.countDocuments();
    console.log(`Total parishioners in database: ${count}\n`);

    if (count > 0) {
      // Get all parishioners with user info
      const parishioners = await Parishioner.find()
        .populate('user', 'email role')
        .sort({ createdAt: -1 });
      console.log('All parishioners:');
      console.log('================');
      parishioners.forEach((p, index) => {
        const email = typeof p.user === 'object' && p.user !== null ? p.user.email : 'N/A';
        console.log(`\n${index + 1}. ${p.firstName} ${p.lastName}`);
        console.log(`   Email: ${email}`);
        console.log(`   User ID: ${p.user?._id || 'N/A'}`);
        console.log(`   Parishioner ID: ${p._id}`);
        console.log(`   Created: ${p.createdAt}`);
        console.log(`   Phone: ${p.phone || 'N/A'}`);
      });
    } else {
      console.log('No parishioners found in the database.');
    }

    // Check recent registrations (last 5)
    const recent = await Parishioner.find()
      .populate('user', 'email role')
      .sort({ createdAt: -1 })
      .limit(5);
    
    if (recent.length > 0) {
      console.log('\n\nMost recent registrations:');
      console.log('========================');
      recent.forEach((p, index) => {
        const email = typeof p.user === 'object' && p.user !== null ? p.user.email : 'N/A';
        console.log(`\n${index + 1}. ${p.firstName} ${p.lastName} (${email})`);
        console.log(`   Registered: ${p.createdAt}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking parishioners:', error);
    process.exit(1);
  }
};

checkParishioners();

