/* ============================================================
   GearRent Hub — Dashboard (dashboard.js)
   Personalized user dashboard for bookings, rentals & listings
   ============================================================ */

let currentDashboardData = {
  bookings: [],
  listings: []
};
let activeDashboardTab = 'bookings';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadDashboard();
  window.addEventListener('auth-changed', () => loadDashboard());
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Load dashboard data (authenticated or guest) ──────────────
async function loadDashboard() {
  showDashboardSkeleton();
  const user = typeof auth !== 'undefined' ? auth.getUser() : null;

  renderUserHeader(user);

  try {
    if (user && auth.isLoggedIn()) {
      // Authenticated: load user-specific bookings & listings
      const data = await apiFetch('/api/auth/my-dashboard');
      currentDashboardData.bookings = data.bookings || [];
      currentDashboardData.listings = data.listings || [];
    } else {
      // Guest: load recent public bookings
      const data = await fetchBookings();
      currentDashboardData.bookings = data.bookings || [];
      currentDashboardData.listings = [];
    }

    renderDashboardStats(currentDashboardData.bookings, currentDashboardData.listings);
    renderDashboardTabs();
    renderActiveTabContent();
  } catch (err) {
    document.getElementById('bookings-root').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Couldn't load dashboard</div>
        <div class="empty-state-text">Make sure the server is running, then refresh.</div>
      </div>`;
    console.error(err);
  }
}

// ── Render User Profile Header or Guest Banner ────────────────
function renderUserHeader(user) {
  let headerWrap = document.getElementById('user-dashboard-banner');
  if (!headerWrap) {
    headerWrap = document.createElement('div');
    headerWrap.id = 'user-dashboard-banner';
    const headerSection = document.querySelector('.section-header');
    if (headerSection && headerSection.parentNode) {
      headerSection.parentNode.insertBefore(headerWrap, headerSection.nextSibling);
    }
  }

  if (user) {
    const roleTitle = user.role === 'creator_host' ? 'Creator & Equipment Host' : 'Verified Renter';
    headerWrap.innerHTML = `
      <div class="glass-card" style="padding:var(--space-xl); margin-bottom:var(--space-xl); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-md); border:1px solid rgba(99,102,241,0.25);">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:54px; height:54px; border-radius:50%; background:linear-gradient(135deg,var(--clr-primary),var(--clr-accent)); display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:800; color:#fff;">
            ${user.name ? user.name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:1.3rem; font-weight:800; margin:0;">${user.name}</h2>
              <span style="background:rgba(16,185,129,0.12); color:var(--clr-success); border:1px solid rgba(16,185,129,0.25); border-radius:var(--radius-full); padding:2px 8px; font-size:0.75rem; font-weight:700;">✓ ID Verified</span>
            </div>
            <div style="color:var(--clr-text-3); font-size:0.85rem; margin-top:2px;">${user.email} • ${roleTitle} • 📍 ${user.location || 'Local Creator'}</div>
            <div style="color:var(--clr-text-2); font-size:0.8rem; margin-top:4px;">🛡️ Backed by GearRent Hub <strong>$10,000 Protection Guarantee</strong></div>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <a href="/" class="btn btn-outline btn-sm btn-rounded">🎬 Browse Gear</a>
          <button type="button" class="btn btn-ghost btn-sm" onclick="auth.logout()">Sign Out</button>
        </div>
      </div>`;
  } else {
    headerWrap.innerHTML = `
      <div class="glass-card" style="padding:var(--space-xl); margin-bottom:var(--space-xl); background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(245,158,11,0.05)); border:1px solid var(--clr-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-md);">
        <div>
          <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:4px;">Sign In to Your Creator Hub Account</h3>
          <p style="font-size:0.85rem; color:var(--clr-text-3);">Access your personal equipment rentals, host listings, and security deposit returns.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-primary btn-sm btn-rounded" onclick="openAuthModal('login')">🔑 Sign In</button>
          <button type="button" class="btn btn-accent btn-sm btn-rounded" onclick="openAuthModal('signup')">Join Community</button>
        </div>
      </div>`;
  }
}

// ── Render Stats Row ──────────────────────────────────────────
function renderDashboardStats(bookings, listings) {
  const statsEl = document.getElementById('dash-stats');
  if (!statsEl) return;

  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const totalSpent = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.pricing?.totalWithDeposit || 0), 0);

  statsEl.innerHTML = `
    <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
      <div style="font-size:2rem; font-weight:800; font-family:var(--font-display);">${bookings.length}</div>
      <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Rentals Booked</div>
    </div>
    <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
      <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-success);">${confirmed}</div>
      <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Active / Confirmed</div>
    </div>
    <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
      <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-accent);">${listings.length}</div>
      <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">My Gear Listed</div>
    </div>
    <div class="glass-card" style="padding:var(--space-lg); text-align:center;">
      <div style="font-size:2rem; font-weight:800; font-family:var(--font-display); color:var(--clr-primary-l);">${formatCurrency(totalSpent)}</div>
      <div style="font-size:.8rem; color:var(--clr-text-3); text-transform:uppercase; letter-spacing:.06em; margin-top:4px;">Rental Volume</div>
    </div>`;
}

// ── Render Tabs (My Bookings vs My Listings) ──────────────────
function renderDashboardTabs() {
  const container = document.querySelector('.container.section');
  if (!container) return;

  let tabWrap = document.getElementById('dash-tab-switcher');
  if (!tabWrap) {
    tabWrap = document.createElement('div');
    tabWrap.id = 'dash-tab-switcher';
    tabWrap.style.cssText = 'display:flex; gap:12px; margin-bottom:var(--space-xl); border-bottom:1px solid var(--clr-border); padding-bottom:8px;';
    const listHeader = document.querySelector('.container.section > div[style*="justify-content:space-between"]');
    if (listHeader) {
      listHeader.parentNode.insertBefore(tabWrap, listHeader);
    }
  }

  const bCount = currentDashboardData.bookings.length;
  const lCount = currentDashboardData.listings.length;

  tabWrap.innerHTML = `
    <button type="button" class="btn btn-sm ${activeDashboardTab === 'bookings' ? 'btn-primary' : 'btn-ghost'}" onclick="setDashboardTab('bookings')">
      📋 My Rental Bookings (${bCount})
    </button>
    <button type="button" class="btn btn-sm ${activeDashboardTab === 'listings' ? 'btn-primary' : 'btn-ghost'}" onclick="setDashboardTab('listings')">
      🎥 My Listed Equipment (${lCount})
    </button>
  `;
}

function setDashboardTab(tab) {
  activeDashboardTab = tab;
  renderDashboardTabs();
  renderActiveTabContent();
}

function renderActiveTabContent() {
  const root = document.getElementById('bookings-root');
  if (!root) return;

  if (activeDashboardTab === 'bookings') {
    renderBookingsList(currentDashboardData.bookings, root);
  } else {
    renderListingsList(currentDashboardData.listings, root);
  }
}

// ── Render Bookings List ──────────────────────────────────────
function renderBookingsList(bookings, root) {
  if (!bookings.length) {
    root.innerHTML = `
      <div class="empty-state" style="padding:var(--space-4xl) var(--space-lg);">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No bookings found</div>
        <div class="empty-state-text">Rent cameras, lenses, or drones from local creators.</div>
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

// ── Render Listings List ──────────────────────────────────────
function renderListingsList(listings, root) {
  if (!listings.length) {
    root.innerHTML = `
      <div class="empty-state" style="padding:var(--space-4xl) var(--space-lg);">
        <div class="empty-state-icon">📸</div>
        <div class="empty-state-title">No gear listed yet</div>
        <div class="empty-state-text">Have cameras, drones, or lights sitting idle? Turn them into passive income!</div>
        <button type="button" class="btn btn-accent btn-rounded" style="margin-top:var(--space-lg);" onclick="openListGearModal()">
          💰 List Your First Item Free
        </button>
      </div>`;
    return;
  }

  root.innerHTML = listings.map(item => `
    <div class="glass-card" style="padding:var(--space-lg); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-md);">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:60px; height:60px; border-radius:var(--radius-lg); background:var(--clr-surface); overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" />` : `<span style="font-size:1.8rem;">🎬</span>`}
        </div>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="font-size:1.1rem; font-weight:700; margin:0;">${item.name}</h3>
            <span class="badge badge-accent">${item.badge || 'Creator Host'}</span>
          </div>
          <div style="font-size:0.82rem; color:var(--clr-text-3); margin-top:2px;">
            ${item.category.toUpperCase()} • 📍 ${item.location || 'Local Area'} • Suggested Deposit: ${formatCurrency(item.deposit)}
          </div>
          <div style="font-size:0.85rem; color:var(--clr-accent); font-weight:700; margin-top:4px;">
            ${formatCurrency(item.dailyRate)}/day
          </div>
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span style="font-size:0.8rem; color:var(--clr-success); font-weight:600;">● Active in Catalog</span>
        <a href="/gear.html?id=${item.id}" class="btn btn-outline btn-sm btn-rounded">View Listing →</a>
      </div>
    </div>
  `).join('');
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
    <div class="booking-card${isCancelled ? ' cancelled' : ''}" id="booking-${booking.id}">
      <div class="booking-card-icon" aria-hidden="true">${catEmoji}</div>
      <div class="booking-card-body">
        <div class="booking-card-id">${booking.id}</div>
        <h3 class="booking-card-name">${booking.equipmentName}</h3>
        <div class="booking-card-dates">
          <span>📅</span>
          <span>${formatDateRange(booking.startDate, booking.endDate)}</span>
          <span style="color:var(--clr-text-3);">(${booking.days} day${booking.days > 1 ? 's' : ''})</span>
        </div>
        <div class="booking-card-meta">
          <span>Customer: <strong>${booking.customer.name}</strong></span>
          <span>•</span>
          <span>Total: <strong>${formatCurrency(booking.pricing?.totalWithDeposit || 0)}</strong></span>
          <span>(incl. ${formatCurrency(booking.pricing?.deposit || 0)} deposit)</span>
        </div>
      </div>
      <div class="booking-card-actions">
        ${statusHTML}
        ${isConfirmed
          ? `<button class="btn btn-danger btn-sm cancel-btn" data-id="${booking.id}" aria-label="Cancel booking ${booking.id}">
               Cancel Booking
             </button>`
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
