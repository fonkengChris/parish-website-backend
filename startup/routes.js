import express from 'express';
import authRoutes from '../routes/auth.js';
import announcementRoutes from '../routes/announcements.js';
import eventRoutes from '../routes/events.js';
import massScheduleRoutes from '../routes/massSchedule.js';
import missionStationRoutes from '../routes/missionStations.js';
import ministryRoutes from '../routes/ministries.js';
import galleryRoutes from '../routes/gallery.js';
import parishionerRoutes from '../routes/parishioners.js';
import prayerRoutes from '../routes/prayers.js';
import sermonRoutes from '../routes/sermons.js';
import liturgicalColorRoutes from '../routes/liturgicalColor.js';
import liturgicalColorOverridesRoutes from '../routes/liturgicalColorOverrides.js';
import notificationRoutes from '../routes/notifications.js';
import contactRoutes from '../routes/contact.js';
import userRoutes from '../routes/users.js';
import saintsRoutes from '../routes/saints.js';
import donationRoutes from '../routes/donations.js';

export const setupRoutes = (app) => {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Parish Website API is running',
      timestamp: new Date().toISOString()
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/mass-schedule', massScheduleRoutes);
  app.use('/api/mission-stations', missionStationRoutes);
  app.use('/api/ministries', ministryRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/parishioners', parishionerRoutes);
  app.use('/api/prayers', prayerRoutes);
  app.use('/api/sermons', sermonRoutes);
  app.use('/api/liturgical-color', liturgicalColorRoutes);
  app.use('/api/liturgical-color-overrides', liturgicalColorOverridesRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/saints', saintsRoutes);
  app.use('/api/donations', donationRoutes);

  // 404 handler for undefined routes
  app.use('*', (req, res) => {
    res.status(404).json({ 
      message: 'Route not found',
      path: req.originalUrl
    });
  });
};

