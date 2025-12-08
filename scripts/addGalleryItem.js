import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GalleryItem from '../models/GalleryItem.js';

dotenv.config();

const addGalleryItem = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parish-website';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if the item already exists
    const existingItem = await GalleryItem.findOne({ imageUrl: '/images/inside-view.jpeg' });
    if (existingItem) {
      console.log('Gallery item with this image already exists:', existingItem);
      await mongoose.disconnect();
      return;
    }

    // Create the gallery item
    const galleryItem = new GalleryItem({
      title: 'Inside View of the Church',
      imageUrl: '/images/inside-view.jpeg',
      category: 'general',
      isActive: true
    });

    await galleryItem.save();
    console.log('Gallery item added successfully:', galleryItem);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error adding gallery item:', error);
    process.exit(1);
  }
};

addGalleryItem();

