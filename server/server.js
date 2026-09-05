const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'DealFlow360 API (Gada Electronics)',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api', apiRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 DealFlow360 API running on http://localhost:${PORT}`);
  console.log(`🏬 Enterprise Platform for Gada Electronics`);
  console.log(`📊 Connected to MySQL DB: ${process.env.MYSQL_DATABASE || 'dealflow360'}`);
  console.log(`====================================================`);
});
