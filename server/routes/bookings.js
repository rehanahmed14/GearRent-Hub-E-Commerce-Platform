const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');

const BOOKINGS_PATH = path.join(__dirname, '../data/bookings.json');
const EQUIPMENT_PATH = path.join(__dirname, '../data/equipment.json');

function loadBookings() {
  const raw = fs.readFileSync(BOOKINGS_PATH, 'utf8');
  return JSON.parse(raw).bookings;
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_PATH, JSON.stringify({ bookings }, null, 2), 'utf8');
}

function loadEquipment() {
  const raw = fs.readFileSync(EQUIPMENT_PATH, 'utf8');
  return JSON.parse(raw).equipment;
}

// GET /api/bookings — list all bookings
router.get('/', (req, res) => {
  try {
    const bookings = loadBookings();
    // Sort by creation date, newest first
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load bookings', message: err.message });
  }
});

// GET /api/bookings/:id — single booking
router.get('/:id', (req, res) => {
  try {
    const bookings = loadBookings();
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load booking' });
  }
});

// POST /api/bookings — create new booking
router.post('/', optionalAuth, (req, res) => {
  try {
    const { equipmentId, startDate, endDate, customer } = req.body;

    // Validation
    const errors = [];
    if (!equipmentId) errors.push('equipmentId is required');
    if (!startDate) errors.push('startDate is required');
    if (!endDate) errors.push('endDate is required');
    if (!customer) errors.push('customer info is required');
    if (customer) {
      if (!customer.name || customer.name.trim().length < 2) errors.push('Customer name must be at least 2 characters');
      if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Valid email is required');
      if (!customer.phone || customer.phone.trim().length < 7) errors.push('Valid phone number is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, error: 'End date must be after start date' });
    }
    if (start < new Date(new Date().setHours(0,0,0,0))) {
      return res.status(400).json({ success: false, error: 'Start date cannot be in the past' });
    }

    // Check equipment exists
    const equipment = loadEquipment();
    const item = equipment.find(e => e.id === equipmentId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }
    if (!item.available) {
      return res.status(409).json({ success: false, error: 'Equipment is not available for rental' });
    }

    // Check date conflicts with existing bookings
    const bookings = loadBookings();
    const conflict = bookings.find(b =>
      b.equipmentId === equipmentId &&
      b.status !== 'cancelled' &&
      new Date(b.startDate) < end &&
      new Date(b.endDate) > start
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: 'Date conflict',
        message: `This equipment is already booked from ${conflict.startDate} to ${conflict.endDate}`
      });
    }

    // Calculate pricing
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;

    let rentalBase = 0;
    if (days >= 7 && item.weeklyRate) {
      rentalBase = weeks * item.weeklyRate + remainingDays * item.dailyRate;
    } else {
      rentalBase = days * item.dailyRate;
    }

    const platformFee = parseFloat((rentalBase * 0.08).toFixed(2));
    const subtotal = parseFloat((rentalBase + platformFee).toFixed(2));
    const totalWithDeposit = parseFloat((subtotal + item.deposit).toFixed(2));

    const newBooking = {
      id: `BK-${uuidv4().split('-')[0].toUpperCase()}`,
      userId: req.user ? req.user.id : null,
      equipmentId,
      equipmentName: item.name,
      equipmentCategory: item.category,
      startDate,
      endDate,
      days,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim()
      },
      pricing: {
        rentalBase,
        platformFee,
        deposit: item.deposit,
        subtotal,
        totalWithDeposit,
        currency: 'USD'
      },
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    saveBookings(bookings);

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create booking', message: err.message });
  }
});

// DELETE /api/bookings/:id — cancel booking
router.delete('/:id', (req, res) => {
  try {
    const bookings = loadBookings();
    const idx = bookings.findIndex(b => b.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (bookings[idx].status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Booking is already cancelled' });
    }

    bookings[idx].status = 'cancelled';
    bookings[idx].cancelledAt = new Date().toISOString();
    saveBookings(bookings);

    res.json({ success: true, message: 'Booking cancelled successfully', booking: bookings[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel booking', message: err.message });
  }
});

module.exports = router;
