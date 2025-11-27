import express from 'express';
import { loadConfig } from './startup/config.js';
import { connectDB } from './startup/db.js';
import { setupCors } from './startup/cors.js';
import { setupMiddleware } from './startup/middleware.js';
import { setupRoutes } from './startup/routes.js';
import { setupScheduler } from './startup/scheduler.js';
import { errorHandler } from './startup/errorHandler.js';

// Load configuration
loadConfig();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup CORS
setupCors(app);

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Setup scheduled tasks
    setupScheduler();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


