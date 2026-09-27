const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, requireAuth } = require('../middleware/auth');

const USERS_PATH = path.join(__dirname, '../data/users.json');
const BOOKINGS_PATH = path.join(__dirname, '../data/bookings.json');
const EQUIPMENT_PATH = path.join(__dirname, '../data/equipment.json');

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')).users;
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify({ users }, null, 2), 'utf8');
}

// POST /api/auth/register — create new user account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'creator_host', phone, location, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const users = loadUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${uuidv4().slice(0, 8)}`;

    const newUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'creator_host', // 'renter' or 'creator_host'
      phone: phone ? phone.trim() : '',
      location: location ? location.trim() : 'Local Creator',
      bio: bio ? bio.trim() : 'Independent Creator & Filmmaker',
      verified: true,
      protectionLimit: 10000,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=6366f1`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const token = generateToken(newUser);
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed', message: err.message });
  }
});

// POST /api/auth/login — sign into existing account
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed', message: err.message });
  }
});

// GET /api/auth/me — get currently logged in user profile
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// GET /api/auth/my-dashboard — get bookings and listings for current user
router.get('/my-dashboard', requireAuth, (req, res) => {
  try {
    const user = req.user;
    
    // Load bookings
    let myBookings = [];
    if (fs.existsSync(BOOKINGS_PATH)) {
      const allBookings = JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf8')).bookings || [];
      myBookings = allBookings.filter(b => 
        (b.userId && b.userId === user.id) || 
        (b.customer && b.customer.email && b.customer.email.toLowerCase() === user.email.toLowerCase())
      );
    }

    // Load equipment listings
    let myListings = [];
    if (fs.existsSync(EQUIPMENT_PATH)) {
      const allGear = JSON.parse(fs.readFileSync(EQUIPMENT_PATH, 'utf8')).equipment || [];
      myListings = allGear.filter(g =>
        (g.owner && g.owner.userId && g.owner.userId === user.id) ||
        (g.owner && g.owner.email && g.owner.email.toLowerCase() === user.email.toLowerCase())
      );
    }

    res.json({
      success: true,
      user,
      bookings: myBookings,
      listings: myListings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load user dashboard', message: err.message });
  }
});

module.exports = router;
