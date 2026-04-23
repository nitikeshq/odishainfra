import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma';

import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import developerRoutes from './routes/developer.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';
import uploadRoutes from './routes/upload.routes';
import amenityRoutes from './routes/amenity.routes';
import commissionRoutes from './routes/commission.routes';
import websiteRoutes from './routes/website.routes';

const app = express();

// ─── SECURITY ────────────────────────────────────────────────────────────────

app.use(helmet());

const corsOptions: cors.CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://odishainfra.com', 'https://admin.odishainfra.com', 'https://api.odishainfra.com']
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
};
app.use(cors(corsOptions));

// General API limiter: 100 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints: 10 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Correlation ID — attach before logging so it appears in morgan output
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || Math.random().toString(36).substring(2, 15);
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ─── GENERAL MIDDLEWARE ──────────────────────────────────────────────────────

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'OdishaInfra API',
      version: '1.0.0',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', customerRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/website', websiteRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

export default app;
