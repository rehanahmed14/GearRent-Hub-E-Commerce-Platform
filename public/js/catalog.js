/* ============================================================
   GearRent Hub — Catalog (index page logic)
   ============================================================ */

let allEquipment = [];
let activeCategory = 'all';
let searchQuery = '';

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadCatalog();       // also triggers stats after data arrives
  initSearch();
  initCategoryTabs();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Load all equipment from API ────────────────────────────────
async function loadCatalog() {
  showSkeletons();
  try {
    const data = await fetchEquipment();
    allEquipment = data.equipment;
    renderCatalog(allEquipment);
    loadDynamicStats(allEquipment);   // compute stats from real data
  } catch (err) {
    showCatalogError();
    console.error('Failed to load catalog:', err);
  }
}

// ── Render Gear Grid ──────────────────────────────────────────
function renderCatalog(items) {
  const grid = document.getElementById('gear-grid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No gear found</div>
        <div class="empty-state-text">Try a different category or search term</div>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(item => createGearCard(item)).join('');

  // Add click handlers
  grid.querySelectorAll('.gear-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      if (!card.classList.contains('unavailable')) {
        window.location.href = `/gear.html?id=${card.dataset.id}`;
      }
    });
  });
}

function createGearCard(item) {
  const badgeClass = getBadgeClass(item.badge);
  const catEmoji = getCategoryEmoji(item.category);
  // Use real image if available, fall back to styled placeholder
  const hasImage = item.image && item.image !== '';

  const imageHTML = hasImage
    ? `<div class="gear-card-img-wrap cat-${item.category}">
        <img class="gear-card-img"
             src="${item.image}"
             alt="${item.name}"
             loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=\\"gear-card-img-placeholder\\">${catEmoji}</div>'"
        />
        ${!item.available ? '<div class="unavail-badge">Currently Unavailable</div>' : ''}
       </div>`
    : `<div class="gear-card-img-wrap cat-${item.category}">
        <div class="gear-card-img-placeholder">${catEmoji}</div>
        ${!item.available ? '<div class="unavail-badge">Currently Unavailable</div>' : ''}
       </div>`;

  return `
    <article class="gear-card${!item.available ? ' unavailable' : ''}"
             data-id="${item.id}"
             data-category="${item.category}"
             role="button"
             tabindex="${item.available ? '0' : '-1'}"
             aria-label="Rent ${item.name}">
      <!-- Shine layer for 3D reflection -->
      <div class="card-shine" aria-hidden="true"></div>
      ${imageHTML}
      <span class="badge ${badgeClass}">${item.badge}</span>
      <div class="gear-card-body">
        <div class="gear-card-category ${item.category}">${item.category}</div>
        <h2 class="gear-card-name">${item.name}</h2>
        <p class="gear-card-tagline">${item.tagline}</p>
        <div class="gear-card-rating">
          ${item.reviews === 0
            ? `<span class="text-faint" style="font-size:0.8rem; font-style:italic;">Be the first to review</span>`
            : `<span class="stars">${renderStars(item.rating)}</span>
               <span>${item.rating.toFixed(1)}</span>
               <span class="text-faint">(${item.reviews} review${item.reviews !== 1 ? 's' : ''})</span>`
          }
        </div>
        <div class="gear-card-footer">
          <div>
            <div class="gear-price-label">from</div>
            <div class="gear-price-value">${formatCurrency(item.dailyRate)}<span>/day</span></div>
          </div>
          ${item.available
            ? `<button class="btn btn-primary btn-sm btn-rounded" onclick="event.stopPropagation(); window.location.href='/gear.html?id=${item.id}'">
                 Rent Now →
               </button>`
            : `<span class="text-faint text-sm">Unavailable</span>`
          }
        </div>
      </div>
    </article>`;
}

// ── Skeleton Loaders ──────────────────────────────────────────
function showSkeletons(count = 6) {
  const grid = document.getElementById('gear-grid');
  if (!grid) return;
  grid.innerHTML = Array(count).fill(0).map(() => `
    <div class="gear-card" style="pointer-events:none; animation:none;">
      <div class="skeleton" style="height:200px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;"></div>
      <div class="gear-card-body" style="gap:10px; display:flex; flex-direction:column;">
        <div class="skeleton" style="height:12px; width:60px;"></div>
        <div class="skeleton" style="height:20px; width:80%;"></div>
        <div class="skeleton" style="height:14px; width:90%;"></div>
        <div class="skeleton" style="height:14px; width:70%;"></div>
        <div style="display:flex; justify-content:space-between; margin-top:auto; padding-top:12px; border-top: 1px solid var(--clr-border);">
          <div class="skeleton" style="height:28px; width:80px;"></div>
          <div class="skeleton" style="height:32px; width:90px; border-radius: 99px;"></div>
        </div>
      </div>
    </div>`).join('');
}

function showCatalogError() {
  const grid = document.getElementById('gear-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Couldn't load equipment</div>
      <div class="empty-state-text">Make sure the server is running, then <a href="/" style="color:var(--clr-primary-l)">refresh</a>.</div>
    </div>`;
}

// ── Search (debounced) ────────────────────────────────────────
let searchTimer;
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchQuery = e.target.value.trim();
    searchTimer = setTimeout(() => applyFilters(), 300);
  });
}

// ── Category Filter Tabs ──────────────────────────────────────
function initCategoryTabs() {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      applyFilters();
    });
  });
}

function applyFilters() {
  let items = [...allEquipment];
  if (activeCategory !== 'all') {
    items = items.filter(i => i.category === activeCategory);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.tagline.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }
  renderCatalog(items);
  updateResultCount(items.length);
}

function updateResultCount(count) {
  const el = document.getElementById('result-count');
  if (el) el.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

// ── Hero Stats — 100% Real Platform Data ─────────────────────
//
//  stat-gear     = actual count of items in /api/equipment
//  stat-rentals  = confirmed bookings from /api/bookings
//  stat-rating   = mean of ratings submitted by real renters
//                  (shows "New" when no bookings yet)
//  stat-cats     = distinct gear categories in catalog
//
async function loadDynamicStats(equipment) {
  // 1. Gear count — always accurate
  const gearCount = equipment.length;

  // 2. Distinct categories
  const categoryCount = new Set(equipment.map(i => i.category)).size;

  // 3. Confirmed bookings & avg rating — from real booking records
  let confirmedCount = 0;
  let avgRating = null;   // null = no data yet
  try {
    const bData = await fetch('/api/bookings').then(r => r.json());
    const bookings = bData.bookings || [];
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    confirmedCount = confirmed.length;

    // Avg rating: only from bookings that carry a renterRating field
    // (added when a rating feature is implemented in the future)
    const rated = confirmed.filter(b => typeof b.renterRating === 'number');
    if (rated.length > 0) {
      avgRating = rated.reduce((s, b) => s + b.renterRating, 0) / rated.length;
    }
  } catch (_) { /* bookings endpoint unreachable — leave zeros */ }

  // 4. Animate counters
  animateCounter('stat-gear',    gearCount,        '',  0);
  animateCounter('stat-rentals', confirmedCount,   '',  0);
  animateCounter('stat-cats',    categoryCount,    '',  0);

  // Rating: show "New" when no real ratings exist yet
  const ratingEl = document.getElementById('stat-rating');
  if (ratingEl) {
    if (avgRating === null) {
      ratingEl.textContent = 'New';
      ratingEl.style.fontSize = '1.4rem';
      ratingEl.style.color = 'var(--clr-accent)';
    } else {
      animateCounter('stat-rating', avgRating, '', 1);
    }
  }
}

// ── Smooth counter animation ───────────────────────────────────
function animateCounter(id, target, suffix = '', decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  if (target === 0) { el.textContent = '0' + suffix; return; }
  let start = 0;
  const duration = 1400;
  const step = 16;
  const increment = target / (duration / step);
  const timer = setInterval(() => {
    start = Math.min(start + increment, target);
    el.textContent = (decimals > 0 ? start.toFixed(decimals) : Math.round(start)) + suffix;
    if (start >= target) clearInterval(timer);
  }, step);
}
