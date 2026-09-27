const express = require('express');
const cors = require('cors');
const path = require('path');

const equipmentRoutes = require('./routes/equipment');
const bookingsRoutes = require('./routes/bookings');
const pricingRoutes = require('./routes/pricing');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files — no-cache in dev so changes appear immediately
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/pricing', pricingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GearRent Hub API is running', timestamp: new Date().toISOString() });
});

// Fallback to index.html — always send fresh, never cache
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🎬  GearRent Hub server running at http://localhost:${PORT}`);
  console.log(`📦  API available at http://localhost:${PORT}/api\n`);
});

module.exports = app;
