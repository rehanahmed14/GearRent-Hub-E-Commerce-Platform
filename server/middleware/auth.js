const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'gearrent_hub_jwt_secret_production_2026';
const USERS_PATH = path.join(__dirname, '../data/users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
  const raw = fs.readFileSync(USERS_PATH, 'utf8');
  return JSON.parse(raw).users;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware: require a valid Bearer token
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const users = loadUsers();
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been removed.'
      });
    }

    // Attach user without password
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.',
      details: err.message
    });
  }
}

// Middleware: optional auth — attaches req.user if token provided, continues either way
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = loadUsers();
      const user = users.find(u => u.id === decoded.id);
      if (user) {
        const { password, ...safeUser } = user;
        req.user = safeUser;
      }
    }
  } catch (_) {
    // Ignore invalid optional tokens
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  optionalAuth,
  loadUsers
};
