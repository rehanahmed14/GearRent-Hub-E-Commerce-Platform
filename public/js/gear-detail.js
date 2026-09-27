/* ============================================================
   GearRent Hub — Gear Detail Page (gear-detail.js)
   ============================================================ */

let currentEquipment = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    window.location.href = '/';
    return;
  }
  await loadGearDetail(id);
  initDatePicker();
  initTabs();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Load gear data ─────────────────────────────────────────────
async function loadGearDetail(id) {
  try {
    showDetailSkeleton();
    const data = await fetchEquipmentById(id);
    currentEquipment = data.equipment;
    renderDetail(currentEquipment);
  } catch (err) {
    document.getElementById('detail-root').innerHTML = `
      <div class="empty-state" style="margin-top:80px;">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">Gear not found</div>
        <div class="empty-state-text"><a href="/" style="color:var(--clr-primary-l)">← Back to catalog</a></div>
      </div>`;
    console.error(err);
  }
}

// ── Render full detail layout ──────────────────────────────────
function renderDetail(item) {
  document.title = `${item.name} — GearRent Hub`;
  const catEmoji = getCategoryEmoji(item.category);
  const badgeClass = getBadgeClass(item.badge);
  const isAvail = item.available;

  const specsHTML = Object.entries(item.specs).map(([key, val]) => `
    <div class="spec-item">
      <div class="spec-key">${key}</div>
      <div class="spec-val">${val}</div>
    </div>`).join('');

  const featuresHTML = item.features.map(f => `<span class="feature-tag">${f}</span>`).join('');

  // Real image or styled emoji placeholder
  const imageInnerHTML = item.image
    ? `<img class="gear-detail-img"
            src="${item.image}"
            alt="${item.name}"
            onerror="this.outerHTML='<div class=\\"gear-detail-img-placeholder\\">${catEmoji}</div>'"
       />`
    : `<div class="gear-detail-img-placeholder">${catEmoji}</div>`;

  const catColors = { cameras: 'var(--clr-cam)', drones: 'var(--clr-drone)', lighting: 'var(--clr-light)' };
  const catColor = catColors[item.category] || 'var(--clr-primary-l)';

  document.getElementById('detail-root').innerHTML = `
    <div class="container section page-transition">
      <a href="/" class="btn btn-ghost btn-sm" style="margin-bottom: var(--space-lg);">
        ← Back to Catalog
      </a>

      <div style="display:grid; grid-template-columns: 1fr 420px; gap: var(--space-2xl); align-items:start;">
        
        <!-- LEFT: Gear Info -->
        <div>
          <!-- Image -->
          <div class="gear-detail-img-wrap" style="margin-bottom:var(--space-xl);">
            ${imageInnerHTML}
            <span class="badge ${badgeClass}" style="top:var(--space-lg); left:var(--space-lg); z-index:3;">${item.badge}</span>
            <div class="gear-detail-cat-tag">
              <span>${catEmoji}</span>
              <span style="color:${catColor};">${item.category}</span>
            </div>
          </div>

          <!-- Availability -->
          <div class="availability-banner ${isAvail ? 'availability-available' : 'availability-unavailable'}">
            <span>${isAvail ? '✅' : '⛔'}</span>
            <span>${isAvail ? 'Available for Rental' : 'Currently Unavailable'}</span>
          </div>

          <!-- Name & Meta -->
          <div style="margin-bottom:var(--space-lg);">
            <div class="gear-card-category ${item.category}" style="font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px;">${item.category}</div>
            <h1 style="font-size:clamp(1.8rem,4vw,2.8rem); font-weight:900; margin-bottom:6px; font-family:var(--font-display);">${item.name}</h1>
            <p style="font-size:1.1rem; color:var(--clr-text-2); margin-bottom:var(--space-md);">${item.tagline}</p>
            <div class="gear-card-rating">
              <span class="stars" style="font-size:1rem;">${renderStars(item.rating)}</span>
              <span style="font-weight:600;">${item.rating}</span>
              <span class="text-faint">(${item.reviews} verified reviews)</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="detail-tabs" id="detail-tabs">
            <div class="detail-tab active" data-tab="overview">Overview</div>
            <div class="detail-tab" data-tab="specs">Specifications</div>
            <div class="detail-tab" data-tab="features">Features</div>
          </div>

          <!-- Overview Tab -->
          <div class="tab-pane active" id="tab-overview">
            <p style="color:var(--clr-text-2); line-height:1.8; font-size:.95rem;">${item.description}</p>
          </div>

          <!-- Specs Tab -->
          <div class="tab-pane" id="tab-specs">
            <div class="specs-grid">${specsHTML}</div>
          </div>

          <!-- Features Tab -->
          <div class="tab-pane" id="tab-features">
            <div class="features-list">${featuresHTML}</div>
          </div>

          <!-- Pricing info -->
          <div class="info-card" style="margin-top:var(--space-xl);">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
              <div>
                <div class="gear-price-label">Daily Rate</div>
                <div class="gear-price-value" style="font-size:2rem;">${formatCurrency(item.dailyRate)}<span>/day</span></div>
              </div>
              <div>
                <div class="gear-price-label">Weekly Rate</div>
                <div class="gear-price-value" style="font-size:2rem;">${formatCurrency(item.weeklyRate)}<span>/wk</span></div>
              </div>
              <div>
                <div class="gear-price-label">Refundable Deposit</div>
                <div style="font-size:1.1rem; font-weight:700; color:var(--clr-text-2);">${formatCurrency(item.deposit)}</div>
              </div>
              <div>
                <div class="gear-price-label">Platform Fee</div>
                <div style="font-size:1.1rem; font-weight:700; color:var(--clr-text-2);">8% of rental</div>
              </div>
          </div>

          <!-- Verified Host / Creator Guarantee Card -->
          <div class="glass-card" style="margin-top:var(--space-xl); padding: var(--space-lg); border: 1px solid var(--clr-border);">
            <div style="display:flex; align-items:center; gap: 14px;">
              <div style="font-size:1.8rem; width:48px; height:48px; border-radius:50%; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${item.owner ? '👤' : '🛡️'}
              </div>
              <div>
                <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-accent); font-weight:700;">
                  ${item.owner ? 'Verified Creator Host' : 'GearRent Peer-to-Peer Network'}
                </div>
                <div style="font-weight:700; color:#fff; font-size:1.05rem; margin-top:1px;">
                  ${item.owner ? `${item.owner.name} • ${item.location || 'Local Area'}` : 'Direct Creator Exchange'}
                </div>
                <div style="font-size:0.8rem; color:var(--clr-text-3); margin-top:3px;">
                  🛡️ Protected by $10,000 Gear Coverage • ID &amp; Deposit Escrow Verified
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Booking Panel -->
        <div id="booking-panel" style="position:sticky; top: calc(var(--nav-height) + var(--space-lg));">
          
          <!-- Date Picker -->
          <div class="date-picker-wrap" style="margin-bottom:var(--space-lg);">
            <div class="date-picker-header">
              <span>📅</span>
              <h3>Select Rental Dates</h3>
            </div>
            <div class="date-fields">
              <div class="date-field">
                <label for="start-date">Pick-up Date</label>
                <input type="date" id="start-date" class="date-input" min="${todayISO()}" />
              </div>
              <div class="date-field">
                <label for="end-date">Return Date</label>
                <input type="date" id="end-date" class="date-input" min="${addDays(todayISO(), 1)}" />
              </div>
            </div>
            <div class="duration-display" id="duration-display" style="margin-top:var(--space-md);">
              Select dates to see duration
            </div>
          </div>

          <!-- Price Breakdown -->
          <div class="price-box" id="price-box">
            <div class="price-box-header">
              <span>💰</span>
              <h3>Price Breakdown</h3>
            </div>
            <div class="price-box-body" id="price-breakdown">
              <div class="empty-state" style="padding:var(--space-lg);">
                <div style="font-size:2rem; margin-bottom:var(--space-sm);">📅</div>
                <div style="color:var(--clr-text-3); font-size:.875rem;">Select dates to see live pricing</div>
              </div>
            </div>
          </div>

          <!-- Savings badge (hidden until relevant) -->
          <div id="savings-row" class="hidden" style="margin-top:var(--space-md); text-align:center;"></div>

          <!-- Book Now Button -->
          <button class="btn btn-accent btn-full btn-xl" id="book-btn" 
                  style="margin-top:var(--space-lg);" 
                  ${!isAvail ? 'disabled' : ''}
                  onclick="handleBookNow()">
            ${isAvail ? '🎬 Book Now' : '⛔ Unavailable'}
          </button>

          <p class="price-note">
            🔒 Free cancellation up to 48h before pickup. Deposit is fully refundable.
          </p>
        </div>
      </div>
    </div>`;

  // Responsive layout for mobile
  applyDetailResponsive();
}

function applyDetailResponsive() {
  if (window.innerWidth <= 900) {
    const panel = document.getElementById('booking-panel');
    if (panel) {
      panel.style.position = 'relative';
      panel.style.top = '0';
    }
    const root = document.querySelector('#detail-root .container > div');
    if (root) root.style.gridTemplateColumns = '1fr';
  }
}

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.detail-tab');
    if (!tab) return;
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const pane = document.getElementById(`tab-${tab.dataset.tab}`);
    if (pane) pane.classList.add('active');
  });
}

// ── Date Picker & Live Pricing ────────────────────────────────
let priceDebounce;
function initDatePicker() {
  document.addEventListener('change', (e) => {
    if (e.target.id === 'start-date' || e.target.id === 'end-date') {
      handleDateChange();
    }
  });
}

function handleDateChange() {
  const startEl = document.getElementById('start-date');
  const endEl   = document.getElementById('end-date');
  const durEl   = document.getElementById('duration-display');
  if (!startEl || !endEl) return;

  const start = startEl.value;
  const end   = endEl.value;

  // Update end date min
  if (start && endEl) {
    endEl.min = addDays(start, 1);
    if (end && end <= start) {
      endEl.value = addDays(start, 1);
    }
  }

  if (!start || !end) {
    if (durEl) durEl.textContent = 'Select dates to see duration';
    return;
  }

  const days = Math.ceil((new Date(end) - new Date(start)) / 86400000);
  if (days <= 0) {
    if (durEl) durEl.textContent = 'Return date must be after pick-up';
    return;
  }

  if (durEl) {
    durEl.textContent = `📆 ${days} day${days !== 1 ? 's' : ''} rental`;
  }

  // Debounce the API price call
  clearTimeout(priceDebounce);
  showPriceLoading();
  priceDebounce = setTimeout(() => fetchLivePrice(start, end), 350);
}

function showPriceLoading() {
  const el = document.getElementById('price-breakdown');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:var(--space-sm); padding:var(--space-xl); color:var(--clr-text-3); font-size:.875rem;">
      <span class="spinner"></span> Calculating price...
    </div>`;
}

async function fetchLivePrice(start, end) {
  if (!currentEquipment) return;
  try {
    const data = await calculatePrice(currentEquipment.id, start, end);
    renderPriceBreakdown(data.pricing);
  } catch (err) {
    const el = document.getElementById('price-breakdown');
    if (el) el.innerHTML = `<div style="padding:var(--space-md); color:var(--clr-danger); font-size:.875rem;">⚠️ ${err.message || 'Pricing unavailable'}</div>`;
  }
}

function renderPriceBreakdown(p) {
  const el = document.getElementById('price-breakdown');
  const savingsRow = document.getElementById('savings-row');
  if (!el) return;

  el.innerHTML = `
    <div class="price-line">
      <span class="label">📦 Rental (${p.priceNote})</span>
      <span>${formatCurrency(p.rentalBase)}</span>
    </div>
    <div class="price-line">
      <span class="label">🔧 Platform Fee (${p.platformFeePercent}%)</span>
      <span>${formatCurrency(p.platformFee)}</span>
    </div>
    <div class="price-line">
      <span class="label">🔒 Refundable Deposit</span>
      <span style="color:var(--clr-text-3);">${formatCurrency(p.deposit)}</span>
    </div>
    <div class="price-total-line">
      <span class="price-total-label">Total Due Now</span>
      <span class="price-total-value" id="live-total">${formatCurrency(p.totalWithDeposit)}</span>
    </div>`;

  // Animate the total value
  const totalEl = document.getElementById('live-total');
  if (totalEl) {
    totalEl.classList.add('updating');
    setTimeout(() => totalEl.classList.remove('updating'), 500);
  }

  // Show savings pill if applicable
  if (savingsRow && p.savingsVsDaily > 0) {
    savingsRow.classList.remove('hidden');
    savingsRow.innerHTML = `<span class="savings-pill">💚 Weekly rate saves you ${formatCurrency(p.savingsVsDaily)}</span>`;
  } else if (savingsRow) {
    savingsRow.classList.add('hidden');
  }
}

// ── Book Now ──────────────────────────────────────────────────
function handleBookNow() {
  const start = document.getElementById('start-date')?.value;
  const end   = document.getElementById('end-date')?.value;

  if (!start || !end) {
    showToast('warning', 'Select Dates', 'Please choose pick-up and return dates first.');
    document.getElementById('start-date')?.focus();
    return;
  }

  if (!currentEquipment) return;

  // Store in sessionStorage and redirect
  sessionStorage.setItem('booking_data', JSON.stringify({
    equipmentId: currentEquipment.id,
    equipmentName: currentEquipment.name,
    equipmentCategory: currentEquipment.category,
    startDate: start,
    endDate: end,
    dailyRate: currentEquipment.dailyRate,
    deposit: currentEquipment.deposit,
  }));

  window.location.href = '/booking.html';
}

// ── Skeleton ──────────────────────────────────────────────────
function showDetailSkeleton() {
  document.getElementById('detail-root').innerHTML = `
    <div class="container section" style="display:grid; grid-template-columns:1fr 400px; gap:var(--space-2xl);">
      <div>
        <div class="skeleton" style="height:420px; border-radius:var(--radius-xl); margin-bottom:var(--space-xl);"></div>
        <div class="skeleton" style="height:16px; width:80px; margin-bottom:var(--space-md);"></div>
        <div class="skeleton" style="height:40px; width:60%; margin-bottom:var(--space-sm);"></div>
        <div class="skeleton" style="height:20px; width:80%; margin-bottom:var(--space-lg);"></div>
        <div class="skeleton" style="height:120px;"></div>
      </div>
      <div>
        <div class="skeleton" style="height:160px; border-radius:var(--radius-xl); margin-bottom:var(--space-lg);"></div>
        <div class="skeleton" style="height:240px; border-radius:var(--radius-xl); margin-bottom:var(--space-lg);"></div>
        <div class="skeleton" style="height:54px; border-radius:var(--radius-md);"></div>
      </div>
    </div>`;
}
