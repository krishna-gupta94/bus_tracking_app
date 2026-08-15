import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRouter from './routes/auth';
import studentRouter from './routes/students';
import driverRouter from './routes/drivers';
import busRouter from './routes/buses';
import routeRouter from './routes/routes';
import tripRouter from './routes/trips';
import locationRouter from './routes/locations';
import notificationRouter from './routes/notifications';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps (no origin) and configured CORS origin
    const allowed = [config.corsOrigin, 'http://localhost:3000', 'http://localhost:19006'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development; restrict in production
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/students', studentRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/buses', busRouter);
app.use('/api/routes', routeRouter);
app.use('/api/trips', tripRouter);
app.use('/api/locations', locationRouter);
app.use('/api/notifications', notificationRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
