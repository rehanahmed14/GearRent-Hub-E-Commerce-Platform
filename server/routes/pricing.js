const express = require('express');
const router = express.Router();

// GET /api/pricing?equipmentId=&startDate=&endDate=
// Returns a full price breakdown
router.get('/', (req, res) => {
  try {
    const { equipmentId, startDate, endDate } = req.query;

    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required params: equipmentId, startDate, endDate'
      });
    }

    // Load equipment to get rates
    const fs = require('fs');
    const path = require('path');
    const raw = fs.readFileSync(path.join(__dirname, '../data/equipment.json'), 'utf8');
    const equipment = JSON.parse(raw).equipment;
    const item = equipment.find(e => e.id === equipmentId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    if (end <= start) {
      return res.status(400).json({ success: false, error: 'End date must be after start date' });
    }

    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;

    // Calculate best price (weekly rate is cheaper)
    let rentalBase = 0;
    let priceNote = '';

    if (days >= 7 && item.weeklyRate) {
      rentalBase = weeks * item.weeklyRate + remainingDays * item.dailyRate;
      priceNote = `${weeks} week${weeks > 1 ? 's' : ''}${remainingDays > 0 ? ` + ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
    } else {
      rentalBase = days * item.dailyRate;
      priceNote = `${days} day${days > 1 ? 's' : ''}`;
    }

    const platformFee = parseFloat((rentalBase * 0.08).toFixed(2)); // 8% platform fee
    const deposit = item.deposit;
    const subtotal = parseFloat((rentalBase + platformFee).toFixed(2));
    const totalWithDeposit = parseFloat((subtotal + deposit).toFixed(2));

    // Daily savings if using weekly rate
    const savingsVsDaily = weeks > 0
      ? parseFloat(((days * item.dailyRate) - rentalBase).toFixed(2))
      : 0;

    res.json({
      success: true,
      pricing: {
        equipmentId,
        equipmentName: item.name,
        startDate,
        endDate,
        days,
        rentalBase,
        priceNote,
        platformFee,
        platformFeePercent: 8,
        deposit,
        subtotal,
        totalWithDeposit,
        dailyRate: item.dailyRate,
        weeklyRate: item.weeklyRate || null,
        savingsVsDaily,
        currency: 'USD'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Pricing calculation failed', message: err.message });
  }
});

module.exports = router;
