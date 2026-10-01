/* ============================================================
   GearRent Hub — Authentication Client (auth.js)
   Handles user sessions, JWT tokens, login/signup modals & UI
   ============================================================ */

const auth = {
  getToken() {
    return localStorage.getItem('gearrent_token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('gearrent_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  },

  isLoggedIn() {
    return !!(this.getToken() && this.getUser());
  },

  setSession(token, user) {
    localStorage.setItem('gearrent_token', token);
    localStorage.setItem('gearrent_user', JSON.stringify(user));
    updateNavbarAuth();
    // Dispatch custom event so pages can react to login
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
  },

  clearSession() {
    localStorage.removeItem('gearrent_token');
    localStorage.removeItem('gearrent_user');
    updateNavbarAuth();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: null } }));
  },

  async login(email, password) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res && res.success) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async register(userData) {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res && res.success) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async fetchMe() {
    if (!this.getToken()) return null;
    try {
      const res = await apiFetch('/api/auth/me');
      if (res && res.success) {
        localStorage.setItem('gearrent_user', JSON.stringify(res.user));
        updateNavbarAuth();
        return res.user;
      }
    } catch (_) {
      this.clearSession();
    }
    return null;
  },

  logout() {
    this.clearSession();
    if (typeof showToast === 'function') {
      showToast('info', 'Logged Out', 'You have been signed out successfully.');
    }
    setTimeout(() => {
      // If on dashboard, reload or redirect
      if (window.location.pathname.includes('dashboard')) {
        window.location.reload();
      }
    }, 400);
  }
};

// ── Auth Modal Controls ───────────────────────────────────────
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) {
    window.location.href = `/login.html?tab=${mode}`;
    return;
  }
  modal.classList.add('active', 'open');
  modal.setAttribute('aria-hidden', 'false');
  switchAuthTab(mode);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active', 'open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const paneLogin = document.getElementById('auth-pane-login');
  const paneSignup = document.getElementById('auth-pane-signup');

  if (tab === 'signup') {
    if (tabSignup) tabSignup.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (paneSignup) paneSignup.style.display = 'block';
    if (paneLogin) paneLogin.style.display = 'none';
    setTimeout(() => {
      const nameInput = document.getElementById('signup-name');
      if (nameInput) nameInput.focus();
    }, 50);
  } else {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (paneLogin) paneLogin.style.display = 'block';
    if (paneSignup) paneSignup.style.display = 'none';
    setTimeout(() => {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    }, 50);
  }
}

// Explicit window assignments for cross-browser inline events
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.auth = auth;

// ── Dynamic Navbar Auth Display ───────────────────────────────
function updateNavbarAuth() {
  const actionsWrap = document.querySelector('.navbar-actions');
  if (!actionsWrap) return;

  const user = auth.getUser();

  if (user) {
    const firstName = user.name ? user.name.split(' ')[0] : 'Creator';
    const roleLabel = user.role === 'creator_host' ? '⭐ Host' : '🎬 Renter';

    actionsWrap.innerHTML = `
      <button type="button" class="btn btn-primary btn-sm btn-rounded" id="nav-list-btn" onclick="openListGearModal()">
        💰 List Gear
      </button>

      <div class="user-menu-wrap" id="user-menu-wrap">
        <button type="button" class="user-pill-btn" id="user-pill-btn" aria-haspopup="true" aria-expanded="false">
          <div class="user-avatar-circle">${firstName[0]}</div>
          <span class="user-pill-name">${firstName}</span>
          <span style="font-size:0.65rem; color:var(--clr-text-3);">▼</span>
        </button>
        <div class="user-dropdown-menu" id="user-dropdown-menu">
          <div class="user-dropdown-header">
            <div style="font-weight:700; color:#fff; font-size:0.95rem;">${user.name}</div>
            <div style="font-size:0.75rem; color:var(--clr-text-3); margin-top:2px;">${user.email}</div>
            <span class="user-role-badge">${roleLabel}</span>
          </div>
          <div class="user-dropdown-divider"></div>
          <a href="/dashboard.html" class="user-dropdown-item">📋 My Bookings &amp; Listings</a>
          <a href="#" class="user-dropdown-item" onclick="openListGearModal(); closeUserMenu(); return false;">💰 List New Gear</a>
          <div class="user-dropdown-divider"></div>
          <button type="button" class="user-dropdown-item logout" onclick="auth.logout()">🚪 Sign Out</button>
        </div>
      </div>
    `;

    // Dropdown toggle
    const pillBtn = document.getElementById('user-pill-btn');
    const dropdown = document.getElementById('user-dropdown-menu');
    if (pillBtn && dropdown) {
      pillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
    }
  } else {
    // Logged out
    actionsWrap.innerHTML = `
      <a href="/login.html?tab=login" class="btn btn-ghost btn-sm" id="nav-signin-btn">
        Sign In
      </a>
      <a href="/login.html?tab=signup" class="btn btn-primary btn-sm btn-rounded" id="nav-signup-btn">
        Sign Up
      </a>
      <button type="button" class="btn btn-outline btn-sm btn-rounded" id="nav-list-btn" onclick="openListGearModal()">
        💰 List Gear
      </button>
    `;
  }
}

function closeUserMenu() {
  const dropdown = document.getElementById('user-dropdown-menu');
  if (dropdown) dropdown.classList.remove('show');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('user-menu-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeUserMenu();
  }
});

// ── Bind Forms & Modals ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  auth.fetchMe(); // silently refresh session in background

  // Bind tabs explicitly
  const tabLogin = document.getElementById('auth-tab-login');
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  const tabSignup = document.getElementById('auth-tab-signup');
  if (tabSignup) tabSignup.addEventListener('click', () => switchAuthTab('signup'));

  // Close modal on outside click
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Close modal with Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.classList.contains('active')) {
      closeAuthModal();
    }
  });

  // Login Form Submission
  const loginForm = document.getElementById('auth-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('login-submit-btn');
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        if (typeof setLoading === 'function') setLoading(submitBtn, true);
        const res = await auth.login(email, password);
        if (res && res.success) {
          if (typeof showToast === 'function') {
            showToast('success', 'Welcome Back!', `Signed in as ${res.user.name}`);
          }
          loginForm.reset();
          closeAuthModal();
          // Prefill list gear modal if opened later
          prefillUserInfo(res.user);
        } else {
          if (typeof showToast === 'function') {
            showToast('error', 'Login Failed', (res && res.error) || 'Invalid credentials');
          }
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Login Error', err.error || err.message || 'Check your email and password');
        }
      } finally {
        if (typeof setLoading === 'function') setLoading(submitBtn, false);
      }
    });
  }

  // Registration Form Submission
  const signupForm = document.getElementById('auth-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('signup-submit-btn');
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const role = document.getElementById('signup-role').value;
      const location = document.getElementById('signup-location').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();

      if (password.length < 6) {
        if (typeof showToast === 'function') {
          showToast('warning', 'Password Too Short', 'Password must be at least 6 characters.');
        }
        return;
      }

      try {
        if (typeof setLoading === 'function') setLoading(submitBtn, true);
        const res = await auth.register({ name, email, password, role, location, phone });
        if (res && res.success) {
          if (typeof showToast === 'function') {
            showToast('success', 'Account Created!', `Welcome to GearRent Hub, ${res.user.name}!`);
          }
          signupForm.reset();
          closeAuthModal();
          prefillUserInfo(res.user);
        } else {
          if (typeof showToast === 'function') {
            showToast('error', 'Registration Failed', (res && res.error) || 'Could not create account');
          }
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Registration Error', err.error || err.message || 'Please check form fields');
        }
      } finally {
        if (typeof setLoading === 'function') setLoading(submitBtn, false);
      }
    });
  }

  // Initial prefill if user is logged in
  const currentUser = auth.getUser();
  if (currentUser) {
    prefillUserInfo(currentUser);
  }
});

function prefillUserInfo(user) {
  if (!user) return;
  // List gear modal inputs
  const ownerNameInput = document.getElementById('list-owner-name');
  const ownerEmailInput = document.getElementById('list-owner-email');
  const ownerPhoneInput = document.getElementById('list-owner-phone');
  const locationInput = document.getElementById('list-location');

  if (ownerNameInput && !ownerNameInput.value) ownerNameInput.value = user.name || '';
  if (ownerEmailInput && !ownerEmailInput.value) ownerEmailInput.value = user.email || '';
  if (ownerPhoneInput && !ownerPhoneInput.value) ownerPhoneInput.value = user.phone || '';
  if (locationInput && !locationInput.value && user.location) locationInput.value = user.location;

  // Booking form inputs on gear-detail page
  const custNameInput = document.getElementById('cust-name');
  const custEmailInput = document.getElementById('cust-email');
  const custPhoneInput = document.getElementById('cust-phone');

  if (custNameInput && !custNameInput.value) custNameInput.value = user.name || '';
  if (custEmailInput && !custEmailInput.value) custEmailInput.value = user.email || '';
  if (custPhoneInput && !custPhoneInput.value) custPhoneInput.value = user.phone || '';
}
