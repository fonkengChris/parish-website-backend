import express from 'express';
import GalleryItem from '../models/GalleryItem.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all active gallery items (public)
router.get('/', async (req, res) => {
  try {
    const galleryItems = await GalleryItem.find({ isActive: true })
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });
    res.json(galleryItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all gallery items (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const galleryItems = await GalleryItem.find()
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });
    res.json(galleryItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single gallery item
router.get('/:id', validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const galleryItem = await GalleryItem.findById(req.params.id)
      .populate('eventId', 'title');
    if (!galleryItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }
    res.json(galleryItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create gallery item (admin)
router.post('/', authenticate, requireAdmin, validate(schemas.galleryItem), async (req, res) => {
  try {
    const galleryItem = new GalleryItem(req.body);
    await galleryItem.save();
    await galleryItem.populate('eventId', 'title');
    res.status(201).json(galleryItem);
  } catch (error) {
    res.status(400).json({ message: 'Error creating gallery item', error: error.message });
  }
});

// Update gallery item (admin)
router.put('/:id', authenticate, requireAdmin, validate(schemas.idParam, 'params'), validate(schemas.galleryItem), async (req, res) => {
  try {
    const galleryItem = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('eventId', 'title');
    if (!galleryItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }
    res.json(galleryItem);
  } catch (error) {
    res.status(400).json({ message: 'Error updating gallery item', error: error.message });
  }
});

// Delete gallery item (admin)
router.delete('/:id', authenticate, requireAdmin, validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const galleryItem = await GalleryItem.findByIdAndDelete(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }
    res.json({ message: 'Gallery item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;


