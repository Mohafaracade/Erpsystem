/**
 * Invoice Management System - Backend Server
 * Production-ready configuration
 */

require('dotenv').config(); // ✅ MUST be first

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const customerRoutes = require('./routes/customers');
const itemRoutes = require('./routes/items');
const invoiceRoutes = require('./routes/invoices');
const receiptRoutes = require('./routes/receipts');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const { addRequestId } = require('./middleware/requestTracing'); // ✅ FIX #11: Request tracing

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.use(helmet());

// ✅ FIX #10: CORS configuration with validation
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000']);
    
    // ✅ FIX #10: Validate origin format
    try {
      const url = new URL(origin);
      // Reject invalid or malformed origins
      if (allowedOrigins.includes(origin) || allowedOrigins.includes(url.origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } catch (error) {
      // Invalid URL format
      callback(new Error('Invalid origin format'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ✅ FIX #11: Add request ID to all requests
app.use(addRequestId);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   STATIC FILES
========================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   DATABASE CONNECTION
========================= */
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI is missing in .env file');
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/* =========================
   ROUTES
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'IMS Backend is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   ERROR HANDLING
========================= */
app.use(notFound);
app.use(errorHandler);

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
