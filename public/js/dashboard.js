/* ============================================================
   GearRent Hub — Dashboard (dashboard.js)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadDashboard();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Load bookings ─────────────────────────────────────────────
async function loadDashboard() {
  showDashboardSkeleton();
  try {
    const data = await fetchBookings();
    renderDashboard(data.bookings);
  } catch (err) {
    document.getElementById('bookings-root').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load bookings</div>
        <div class="empty-state-text">Make sure the server is running, then refresh.</div>
      </div>`;
    console.error(err);
  }
}

// ── Render dashboard ──────────────────────────────────────────
function renderDashboard(bookings) {
  const root = document.getElementById('bookings-root');
  const statsEl = document.getElementById('dash-stats');

  // Stats
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const totalSpent = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.pricing?.totalWithDeposit || 0), 0);

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
        <div style="font-size:2rem; font-weight:800; font-family:var(--font-display);">${bookings.length}</div>
        <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Total Bookings</div>
      </div>
      <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
        <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-success);">${confirmed}</div>
        <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Confirmed</div>
      </div>
      <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
        <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-danger);">${cancelled}</div>
        <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Cancelled</div>
      </div>
      <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
        <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-accent);">${formatCurrency(totalSpent)}</div>
        <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Total Spent</div>
      </div>`;
  }

  if (!bookings.length) {
    root.innerHTML = `
      <div class="empty-state" style="padding:var(--space-4xl) var(--space-lg);">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No bookings yet</div>
        <div class="empty-state-text">When you book gear, it'll appear here.</div>
        <a href="/" class="btn btn-primary btn-rounded" style="margin-top:var(--space-lg);">Browse Gear →</a>
      </div>`;
    return;
  }

  root.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');

  // Cancel buttons
  root.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openCancelModal(id);
    });
  });
}

function createBookingCard(booking) {
  const catEmoji = getCategoryEmoji(booking.equipmentCategory);
  const isConfirmed = booking.status === 'confirmed';
  const isCancelled = booking.status === 'cancelled';

  const statusHTML = {
    confirmed: `<div class="status-badge status-confirmed"><span class="pulse-dot"></span>Confirmed</div>`,
    pending:   `<div class="status-badge status-pending"><span class="pulse-dot"></span>Pending</div>`,
    cancelled: `<div class="status-badge status-cancelled"><span class="pulse-dot"></span>Cancelled</div>`,
  }[booking.status] || '';

  return `
    <div class="booking-card${isCancelled ? ' cancelled' : ''} animate-fade-up" id="booking-${booking.id}">
      <div class="booking-card-icon">${catEmoji}</div>
      <div class="booking-card-meta">
        <div class="booking-id">${booking.id}</div>
        <div class="booking-gear-name">${booking.equipmentName}</div>
        <div class="booking-dates">
          📅 ${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}
          <span class="text-faint">· ${booking.days} day${booking.days !== 1 ? 's' : ''}</span>
        </div>
        <div style="margin-top:6px; font-size:.78rem; color:var(--clr-text-3);">
          👤 ${booking.customer?.name} · ${booking.customer?.email}
        </div>
        ${isCancelled && booking.cancelledAt ? `<div style="font-size:.75rem; color:var(--clr-text-3); margin-top:4px;">Cancelled on ${formatDate(booking.cancelledAt)}</div>` : ''}
      </div>
      <div class="booking-card-actions">
        ${statusHTML}
        <div class="booking-total">${formatCurrency(booking.pricing?.totalWithDeposit || 0)}</div>
        ${isConfirmed
          ? `<button class="btn btn-danger btn-sm cancel-btn" data-id="${booking.id}">Cancel Booking</button>`
          : ''
        }
      </div>
    </div>`;
}

// ── Cancel Modal ──────────────────────────────────────────────
let pendingCancelId = null;

function openCancelModal(id) {
  pendingCancelId = id;
  const overlay = document.getElementById('cancel-modal');
  if (overlay) overlay.classList.add('open');
}

function closeCancelModal() {
  pendingCancelId = null;
  const overlay = document.getElementById('cancel-modal');
  if (overlay) overlay.classList.remove('open');
}

async function confirmCancel() {
  if (!pendingCancelId) return;
  const btn = document.getElementById('confirm-cancel-btn');
  setLoading(btn, true);

  try {
    await cancelBooking(pendingCancelId);

    // Optimistic UI update
    const card = document.getElementById(`booking-${pendingCancelId}`);
    if (card) {
      card.classList.add('cancelled');
      // Update status badge
      const actions = card.querySelector('.booking-card-actions');
      if (actions) {
        const cancelBtn = actions.querySelector('.cancel-btn');
        if (cancelBtn) cancelBtn.remove();
        const statusBadge = actions.querySelector('.status-badge');
        if (statusBadge) {
          statusBadge.className = 'status-badge status-cancelled';
          statusBadge.innerHTML = '<span class="pulse-dot"></span>Cancelled';
        }
      }
    }

    closeCancelModal();
    showToast('success', 'Booking Cancelled', 'Your booking has been cancelled and deposit will be refunded.');
  } catch (err) {
    setLoading(btn, false);
    showToast('error', 'Cancellation Failed', err.message || 'Please try again.');
  }
}

function showDashboardSkeleton() {
  const root = document.getElementById('bookings-root');
  if (!root) return;
  root.innerHTML = Array(3).fill(0).map(() => `
    <div style="background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:var(--radius-xl); padding:var(--space-lg); display:grid; grid-template-columns:52px 1fr auto; gap:var(--space-lg); align-items:center;">
      <div class="skeleton" style="width:52px; height:52px; border-radius:var(--radius-md);"></div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div class="skeleton" style="height:12px; width:80px;"></div>
        <div class="skeleton" style="height:18px; width:60%;"></div>
        <div class="skeleton" style="height:13px; width:70%;"></div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
        <div class="skeleton" style="height:24px; width:80px; border-radius:99px;"></div>
        <div class="skeleton" style="height:22px; width:70px;"></div>
      </div>
    </div>`).join('');
}
