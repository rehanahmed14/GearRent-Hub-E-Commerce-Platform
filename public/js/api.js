/* ============================================================
   GearRent Hub — API Client (api.js)
   Central fetch wrapper for all backend calls
   ============================================================ */

const BASE_URL = '';  // Same origin — Express serves static files

// ── Generic fetch wrapper ──────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('gearrent_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data;
}

// ── Equipment ──────────────────────────────────────────────────
async function fetchEquipment(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.available) params.set('available', 'true');
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/api/equipment${qs}`);
}

async function fetchEquipmentById(id) {
  return apiFetch(`/api/equipment/${id}`);
}

async function createEquipmentListing(payload) {
  return apiFetch('/api/equipment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Pricing ───────────────────────────────────────────────────
async function calculatePrice(equipmentId, startDate, endDate) {
  const params = new URLSearchParams({ equipmentId, startDate, endDate });
  return apiFetch(`/api/pricing?${params}`);
}

// ── Bookings ──────────────────────────────────────────────────
async function fetchBookings() {
  return apiFetch('/api/bookings');
}

async function fetchBookingById(id) {
  return apiFetch(`/api/bookings/${id}`);
}

async function createBooking(payload) {
  return apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function cancelBooking(id) {
  return apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
}

// ── Toast Notifications ───────────────────────────────────────
function showToast(type, title, text, duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '📢'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${text ? `<div class="toast-text">${text}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Loading State ─────────────────────────────────────────────
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Processing...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ── Format Helpers ────────────────────────────────────────────
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateRange(start, end) {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function getCategoryEmoji(category) {
  const map = { cameras: '🎬', drones: '🚁', lighting: '💡' };
  return map[category] || '📦';
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '★';
  if (half) stars += '½';
  return stars;
}

function getBadgeClass(badge) {
  const map = {
    'Most Popular': 'badge-primary',
    'Pro Choice': 'badge-info',
    'Best Value': 'badge-success',
    'Hollywood Grade': 'badge-accent',
    'Top Seller': 'badge-primary',
    'Film Grade': 'badge-accent',
    'Great Value': 'badge-success',
    'Industry Fav': 'badge-primary',
    'Award Winning': 'badge-accent',
    'Budget Pick': 'badge-success',
    'Studio Grade': 'badge-info',
    'Broadcast': 'badge-info',
    'Creator Host': 'badge-accent',
    'Owner Listing': 'badge-accent',
  };
  return map[badge] || 'badge-primary';
}

// ── Today's date as YYYY-MM-DD ─────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
