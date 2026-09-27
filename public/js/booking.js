/* ============================================================
   GearRent Hub — Booking Page (booking.js)
   ============================================================ */

let bookingData = null;
let pricingData = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  loadBookingData();
  if (bookingData) {
    await fetchAndRenderPricing();
    initForm();
  }
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Load booking data from sessionStorage ──────────────────────
function loadBookingData() {
  const raw = sessionStorage.getItem('booking_data');
  if (!raw) {
    document.getElementById('booking-root').innerHTML = `
      <div class="empty-state" style="margin-top:100px;">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-title">No booking in progress</div>
        <div class="empty-state-text"><a href="/" style="color:var(--clr-primary-l)">Browse our gear catalog</a></div>
      </div>`;
    return;
  }

  try {
    bookingData = JSON.parse(raw);
    renderBookingSummary();
  } catch (e) {
    console.error('Invalid booking data', e);
    window.location.href = '/';
  }
}

// ── Fetch live pricing ─────────────────────────────────────────
async function fetchAndRenderPricing() {
  try {
    const res = await calculatePrice(bookingData.equipmentId, bookingData.startDate, bookingData.endDate);
    pricingData = res.pricing;
    renderPriceSummary(pricingData);
  } catch (err) {
    console.error('Pricing error:', err);
    showToast('error', 'Pricing Error', 'Could not calculate price. Please try again.');
  }
}

// ── Render the booking summary panel ──────────────────────────
function renderBookingSummary() {
  const catEmoji = getCategoryEmoji(bookingData.equipmentCategory);
  const days = Math.ceil((new Date(bookingData.endDate) - new Date(bookingData.startDate)) / 86400000);

  document.getElementById('summary-icon').textContent = catEmoji;
  document.getElementById('summary-category').textContent = bookingData.equipmentCategory;
  document.getElementById('summary-name').textContent = bookingData.equipmentName;
  document.getElementById('summary-dates').textContent = `${formatDate(bookingData.startDate)} → ${formatDate(bookingData.endDate)}`;
  document.getElementById('summary-days').textContent = `${days} day${days !== 1 ? 's' : ''} rental`;
}

// ── Render price breakdown ─────────────────────────────────────
function renderPriceSummary(p) {
  const el = document.getElementById('price-summary');
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
      <span class="price-total-value">${formatCurrency(p.totalWithDeposit)}</span>
    </div>`;
}

// ── Form Init & Validation ────────────────────────────────────
function initForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  form.addEventListener('submit', handleSubmit);

  // Real-time validation
  ['customer-name', 'customer-email', 'customer-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => validateField(el));
  });
}

function validateField(el) {
  const id = el.id;
  const val = el.value.trim();
  let error = '';

  if (id === 'customer-name' && val.length < 2) error = 'Name must be at least 2 characters';
  if (id === 'customer-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Enter a valid email address';
  if (id === 'customer-phone' && val.length < 7) error = 'Enter a valid phone number';

  const errEl = document.getElementById(`${id}-error`);
  if (errEl) errEl.textContent = error;
  el.classList.toggle('error', !!error);
  return !error;
}

function validateForm() {
  const fields = ['customer-name', 'customer-email', 'customer-phone'];
  return fields.every(id => validateField(document.getElementById(id)));
}

// ── Submit booking ────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) {
    showToast('error', 'Form Incomplete', 'Please fix the errors before continuing.');
    return;
  }

  const btn = document.getElementById('submit-btn');
  setLoading(btn, true);

  const payload = {
    equipmentId: bookingData.equipmentId,
    startDate: bookingData.startDate,
    endDate: bookingData.endDate,
    customer: {
      name: document.getElementById('customer-name').value.trim(),
      email: document.getElementById('customer-email').value.trim(),
      phone: document.getElementById('customer-phone').value.trim(),
    }
  };

  try {
    const res = await createBooking(payload);
    sessionStorage.removeItem('booking_data');
    showSuccessModal(res.booking);
  } catch (err) {
    setLoading(btn, false);
    const msg = err.message || err.error || 'Booking failed. Please try again.';
    if (err.status === 409) {
      showToast('error', 'Date Conflict', msg);
    } else {
      showToast('error', 'Booking Failed', msg);
    }
  }
}

// ── Success Modal ─────────────────────────────────────────────
function showSuccessModal(booking) {
  const overlay = document.getElementById('success-modal');
  if (!overlay) return;

  document.getElementById('modal-booking-id').textContent = booking.id;
  document.getElementById('modal-gear-name').textContent = booking.equipmentName;
  document.getElementById('modal-dates').textContent = formatDateRange(booking.startDate, booking.endDate);
  document.getElementById('modal-total').textContent = formatCurrency(booking.pricing.totalWithDeposit);

  overlay.classList.add('open');
}

function closeSuccessModal() {
  window.location.href = '/dashboard.html';
}
