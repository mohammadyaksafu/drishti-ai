require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { BANGLADESH_BOUNDS, HAZARD_TYPES } = require('./utils/constants');

const app = express();
app.set('trust proxy', 1);

/* ----------------------------- security ----------------------------- */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Server-to-server calls (curl, the Python worker) send no Origin header.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
      if (process.env.NODE_ENV !== 'production') return cb(null, true);
      return cb(new Error('This origin is not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Lightweight NoSQL-injection guard.
 * Strips any key starting with `$` or containing a dot from request payloads,
 * which is what express-mongo-sanitize does — without mutating req.query
 * (Express 5 makes that getter read-only).
 */
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = sanitize(value[key]);
    }
  }
  return value;
}
app.use((req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Slow down and try again shortly.' },
  })
);

/* --------------------------- db connection -------------------------- */
// Each data request makes sure a (cached) connection exists — the pattern that
// works both for a long-lived local process and for Vercel serverless invocations.
// /api/health deliberately sits outside this so it can *report* a database
// outage instead of failing along with it.
const withDatabase = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
};

/* -------------------------------- routes ---------------------------- */
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    data: {
      service: 'DRISHTI AI API',
      status: 'healthy',
      database: states[mongoose.connection.readyState] || 'unknown',
      coverage: 'Bangladesh',
      bounds: BANGLADESH_BOUNDS,
      hazardClasses: HAZARD_TYPES,
      time: new Date().toISOString(),
    },
  });
});

app.use('/api/auth', withDatabase, require('./routes/authRoutes'));
app.use('/api/reports', withDatabase, require('./routes/reportRoutes'));
app.use('/api/dashboard', withDatabase, require('./routes/dashboardRoutes'));
app.use('/api/jobs', withDatabase, require('./routes/jobRoutes'));
app.use('/api/admin', withDatabase, require('./routes/adminRoutes'));

app.get('/', (req, res) =>
  res.json({ success: true, data: { message: 'DRISHTI AI API. See /api/health.' } })
);

app.use(notFound);
app.use(errorHandler);

/* ------------------------------- listen ----------------------------- */
// Vercel imports the app instead of listening on a port.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`\n  DRISHTI AI API  →  http://localhost:${PORT}`);
        console.log(`  Health check    →  http://localhost:${PORT}/api/health\n`);
      });
    })
    .catch((err) => {
      console.error('[startup] could not connect to MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
