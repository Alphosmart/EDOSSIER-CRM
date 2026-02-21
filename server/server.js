const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startReminderJob } = require('./jobs/reminderJob');
const { startExchangeRateJob } = require('./jobs/exchangeRateJob');
const { seedDefaultRates } = require('./controllers/exchangeRateController');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security
app.use(helmet());

// CORS
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting — general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Too many requests, please try again later.' }
});

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/search', require('./routes/search'));
app.use('/api/exchange-rates', require('./routes/exchangeRates'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EDOSSIER CRM API is running', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ── One-time data migrations ──────────────────────────────────────────────
const runMigrations = async () => {
  try {
    const Lead = require('./models/Lead');

    // Backfill country = 'Nigeria' for all leads that were created before the
    // country field was added to the schema.
    const countryResult = await Lead.updateMany(
      { country: { $in: [null, '', undefined] } },
      { $set: { country: 'Nigeria' } }
    );
    if (countryResult.modifiedCount > 0) {
      console.log(`Migration: backfilled country='Nigeria' on ${countryResult.modifiedCount} leads`);
    }

    // Backfill territory from state (address field) if territory is blank.
    // Nigerian leads created via the form may have state but not territory.
    const territoryResult = await Lead.updateMany(
      { territory: { $in: [null, '', undefined] }, state: { $nin: [null, ''] } },
      [{ $set: { territory: '$state' } }]
    );
    if (territoryResult.modifiedCount > 0) {
      console.log(`Migration: backfilled territory from state on ${territoryResult.modifiedCount} leads`);
    }
  } catch (err) {
    console.error('Migration error (non-fatal):', err.message);
  }
};

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Start scheduled jobs
  startReminderJob();
  // Seed exchange rates defaults if DB is empty
  seedDefaultRates().catch(err => console.error('Exchange rate seed error:', err));
  // Run data migrations
  runMigrations();
  // Start live exchange rate sync job
  startExchangeRateJob();
});
