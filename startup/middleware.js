import express from 'express';
import cookieParser from 'cookie-parser';
import { httpLogger } from '../middleware/requestLogger.js';

export const setupMiddleware = (app) => {
  // Request logging middleware (pino-http) - should be early in the chain
  app.use(httpLogger);

  // Cookie parser middleware (for refresh tokens)
  app.use(cookieParser());

  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

