import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MassSchedule from '../models/MassSchedule.js';
import MissionStation from '../models/MissionStation.js';

dotenv.config();

// Random mission station names
const missionStationNames = [
  'Sacred Heart Mission',
  'Our Lady of Grace Station',
  'St. Michael\'s Outpost',
  'Divine Mercy Chapel',
  'Holy Trinity Station',
  'St. Francis Mission',
  'Immaculate Conception Station',
  'Christ the King Outpost'
];

const seedMassSchedules = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parish-website';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const clearExisting = process.argv[2] === '--clear';
    
    // Clear existing data if requested
    if (clearExisting) {
      await MassSchedule.deleteMany({});
      await MissionStation.deleteMany({});
      console.log('Cleared existing mass schedules and mission stations');
    }

    // Check if mission stations already exist
    const existingStations = await MissionStation.find();
    let missionStations = [];

    if (existingStations.length === 0 || clearExisting) {
      // Create mission stations (select 4 random ones)
      const selectedStations = missionStationNames
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

      for (const name of selectedStations) {
        const station = new MissionStation({
          name,
          location: `${name} Location`,
          description: `Parish mission station: ${name}`,
          isActive: true
        });
        await station.save();
        missionStations.push(station);
        console.log(`Created mission station: ${name}`);
      }
    } else {
      missionStations = existingStations;
      console.log(`Using ${existingStations.length} existing mission stations`);
    }

    // Check if schedules already exist
    const existingCount = await MassSchedule.countDocuments();
    if (existingCount > 0 && !clearExisting) {
      console.log(`Found ${existingCount} existing mass schedules.`);
      console.log('Use --clear flag to clear existing schedules: npm run seed-schedules:clear');
      process.exit(0);
    }

    // Create sample schedules for each mission station
    const sampleSchedules = [];

    missionStations.forEach((station, index) => {
      const stationName = station.name;
      
      // Main Mission gets more schedules
      if (index === 0) {
        sampleSchedules.push(
          {
            missionStation: station._id,
            dayOfWeek: 'Sunday',
            time: '7:00 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Sunday',
            time: '9:00 AM',
            type: 'Mass',
            description: 'Main Sunday Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Sunday',
            time: '11:00 AM',
            type: 'Mass',
            description: 'Late Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Sunday',
            time: '5:00 PM',
            type: 'Mass',
            description: 'Evening Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Monday',
            time: '6:30 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Monday',
            time: '6:00 PM',
            type: 'Mass',
            description: 'Evening Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Tuesday',
            time: '6:30 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Wednesday',
            time: '6:30 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Wednesday',
            time: '6:00 PM',
            type: 'Mass',
            description: 'Evening Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Thursday',
            time: '6:30 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Friday',
            time: '6:30 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Saturday',
            time: '8:00 AM',
            type: 'Mass',
            description: 'Morning Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Saturday',
            time: '5:00 PM',
            type: 'Mass',
            description: 'Vigil Mass',
            isActive: true
          },
          {
            missionStation: station._id,
            dayOfWeek: 'Saturday',
            time: '3:00 PM',
            type: 'Confession',
            description: 'Confession before Vigil Mass',
            isActive: true
          }
        );
      } else {
        // Other stations get fewer schedules
        const times = [
          { day: 'Sunday', time: '8:00 AM', desc: 'Sunday Mass' },
          { day: 'Sunday', time: '10:00 AM', desc: 'Main Sunday Mass' },
          { day: 'Tuesday', time: '7:00 PM', desc: 'Evening Mass' },
          { day: 'Thursday', time: '7:00 PM', desc: 'Evening Mass' },
          { day: 'Saturday', time: '4:00 PM', desc: 'Vigil Mass' }
        ];

        times.forEach(({ day, time, desc }) => {
          sampleSchedules.push({
            missionStation: station._id,
            dayOfWeek: day,
            time,
            type: 'Mass',
            description: desc,
            isActive: true
          });
        });
      }
    });

    // Insert sample schedules
    const inserted = await MassSchedule.insertMany(sampleSchedules);
    console.log(`\nSuccessfully created ${inserted.length} mass schedules!`);
    console.log('\nSchedules created for:');
    missionStations.forEach(station => {
      const count = sampleSchedules.filter(s => s.missionStation.toString() === station._id.toString()).length;
      console.log(`  - ${station.name}: ${count} schedules`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding mass schedules:', error);
    process.exit(1);
  }
};

seedMassSchedules();
