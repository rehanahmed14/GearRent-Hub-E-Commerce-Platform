const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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

// GET /api/equipment/category/list — get distinct categories
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
