const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { optionalAuth } = require('../middleware/auth');

const DATA_PATH = path.join(__dirname, '../data/equipment.json');

function loadEquipment() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw).equipment;
}

// GET /api/equipment — list all, supports ?category=&search=&available=
router.get('/', (req, res) => {

  try {
    let items = loadEquipment();
    const { category, search, available } = req.query;

    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    if (available === 'true') {
      items = items.filter(item => item.available);
    }

    res.json({ success: true, count: items.length, equipment: items });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load equipment', message: err.message });
  }
});

// GET /api/equipment/:id — single item
router.get('/:id', (req, res) => {
  try {
    const items = loadEquipment();
    const item = items.find(e => e.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }
    res.json({ success: true, equipment: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load equipment', message: err.message });
  }
});

// POST /api/equipment — add a new owner listing (Peer-to-Peer marketplace)
router.post('/', optionalAuth, (req, res) => {
  try {
    const {
      name,
      category,
      tagline,
      description,
      dailyRate,
      deposit,
      location,
      ownerName,
      ownerEmail,
      ownerPhone,
      image,
      features,
      specs
    } = req.body;

    if (!name || !category || !dailyRate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, and dailyRate are required.'
      });
    }

    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);
    const rate = parseFloat(dailyRate) || 50;
    const weeklyRate = Math.round(rate * 5.5);
    const dep = deposit !== undefined && deposit !== '' ? parseFloat(deposit) : Math.round(rate * 4);

    const prefix = category === 'cameras' ? 'cam' : category === 'drones' ? 'drone' : category === 'lighting' ? 'light' : 'gear';
    const id = `owner-${prefix}-${Date.now().toString(36)}`;

    // Fallback stock images if no image provided
    let finalImage = image;
    if (!finalImage || !finalImage.trim()) {
      const fallbackImages = {
        cameras: '/images/sony-fx6.jpg',
        drones: '/images/dji-mavic3.jpg',
        lighting: '/images/aputure-600d.jpg'
      };
      finalImage = fallbackImages[category.toLowerCase()] || '/images/sony-fx6.jpg';
    }

    const newEquipment = {
      id,
      name: name.trim(),
      category: category.toLowerCase().trim(),
      tagline: tagline && tagline.trim() ? tagline.trim() : `Hosted by ${ownerName || 'Verified Creator'}`,
      description: description && description.trim() ? description.trim() : `Available for rent directly from local creator in ${location || 'your area'}. Inspected, sanitized, and shoot-ready.`,
      image: finalImage,
      dailyRate: rate,
      weeklyRate,
      deposit: dep,
      location: location && location.trim() ? location.trim() : 'Local Pickup & Handover',
      specs: specs && Object.keys(specs).length ? specs : {
        "Host": ownerName || "Verified Creator",
        "Condition": "Mint / Production-Ready",
        "Location": location || "Metro Area",
        "Protection": "$10,000 GearRent Coverage",
        "Handover": "In-person meetup or local courier"
      },
      features: Array.isArray(features) && features.length ? features : [
        "Creator Verified Host",
        "$10,000 Equipment Protection",
        "Direct Creator Handover",
        "Instant Booking Available"
      ],
      available: true,
      rating: 5.0,
      reviews: 1,
      badge: "Creator Host",
      owner: {
        userId: req.user ? req.user.id : null,
        name: ownerName && ownerName.trim() ? ownerName.trim() : (req.user ? req.user.name : 'Independent Creator'),
        email: ownerEmail && ownerEmail.trim() ? ownerEmail.trim() : (req.user ? req.user.email : ''),
        phone: ownerPhone || (req.user ? req.user.phone : ''),
        location: location || (req.user ? req.user.location : 'Local Area'),
        verified: true,
        memberSince: new Date().getFullYear().toString()
      },
      createdAt: new Date().toISOString()
    };

    // Add to front of equipment list so new listings appear prominently
    data.equipment.unshift(newEquipment);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      message: 'Gear listed successfully!',
      equipment: newEquipment
    });
  } catch (err) {
    console.error('Error adding equipment:', err);
    res.status(500).json({ success: false, error: 'Failed to save equipment listing', message: err.message });
  }
});

// GET /api/equipment/meta/categories — get distinct categories
router.get('/meta/categories', (req, res) => {
  try {
    const items = loadEquipment();
    const categories = [...new Set(items.map(i => i.category))];
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load categories' });
  }
});

module.exports = router;


