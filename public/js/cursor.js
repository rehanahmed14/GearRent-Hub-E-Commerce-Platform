/* ============================================================
   GearRent Hub — Cursor & Emotion Animation Engine
   ============================================================ */

(function () {
  'use strict';

  // ── Cursor DOM ─────────────────────────────────────────────
  const ring    = document.getElementById('cursor-ring');
  const dot     = document.getElementById('cursor-dot');
  const aura    = document.getElementById('cursor-aura');
  const emotion = document.getElementById('cursor-emotion');

  if (!ring || !dot) return; // no cursor elements, bail

  // ── Position Tracking ──────────────────────────────────────
  let mouseX = -200, mouseY = -200;
  let ringX  = -200, ringY  = -200;
  let auraX  = -200, auraY  = -200;
  let raf;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
    emotion.style.left = mouseX + 'px';
    emotion.style.top  = mouseY + 'px';
  });

  // Ring & aura lag smoothly behind
  function animateCursor() {
    // Ring follows with slight lag
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';

    // Aura follows even slower
    auraX += (mouseX - auraX) * 0.06;
    auraY += (mouseY - auraY) * 0.06;
    aura.style.left = auraX + 'px';
    aura.style.top  = auraY + 'px';

    raf = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Hide on leave, show on enter
  document.addEventListener('mouseleave', () => {
    ring.style.opacity  = '0';
    dot.style.opacity   = '0';
    aura.style.opacity  = '0';
  });
  document.addEventListener('mouseenter', () => {
    ring.style.opacity  = '1';
    dot.style.opacity   = '1';
    aura.style.opacity  = '1';
  });

  // ── Click particle burst ────────────────────────────────────
  document.addEventListener('mousedown', () => {
    document.body.classList.add('cursor-click');
    spawnParticles(mouseX, mouseY);
  });
  document.addEventListener('mouseup', () => {
    document.body.classList.remove('cursor-click');
  });

  function spawnParticles(x, y) {
    const colors = ['#6366f1','#f59e0b','#10b981','#06b6d4','#8b5cf6','#fff'];
    const count  = 10;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'cursor-particle';
      const size  = 4 + Math.random() * 6;
      const angle = (i / count) * 360;
      const dist  = 40 + Math.random() * 60;
      const tx    = Math.cos(angle * Math.PI / 180) * dist;
      const ty    = Math.sin(angle * Math.PI / 180) * dist;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `
        left:${x}px; top:${y}px;
        width:${size}px; height:${size}px;
        background:${color};
        --tx:${tx}px; --ty:${ty}px;
        box-shadow: 0 0 6px ${color};
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  // ── Emotion State Machine ───────────────────────────────────
  const STATES = ['cursor-hover','cursor-excited','cursor-happy',
                  'cursor-focus','cursor-zoom','cursor-click'];

  function clearStates() {
    document.body.classList.remove(...STATES);
    emotion.textContent = '';
  }

  function setEmotion(state, emoji = '') {
    clearStates();
    if (state) document.body.classList.add(state);
    emotion.textContent = emoji;
  }

  // ── Gear Cards → EXCITED ───────────────────────────────────
  let cardHoverTimer;

  function bindGearCards() {
    document.querySelectorAll('.gear-card:not(.unavailable)').forEach(card => {
      card.addEventListener('mouseenter', () => {
        setEmotion('cursor-excited', '✨');
        // Love animation after 800ms of hovering
        cardHoverTimer = setTimeout(() => {
          card.classList.add('emotion-love');
          setTimeout(() => card.classList.remove('emotion-love'), 500);
          spawnFloatingEmoji(mouseX, mouseY, ['❤️','✨','🔥'][Math.floor(Math.random()*3)]);
        }, 800);
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(cardHoverTimer);
        clearStates();
      });
    });

    // Unavailable cards → sad
    document.querySelectorAll('.gear-card.unavailable').forEach(card => {
      card.addEventListener('mouseenter', () => setEmotion('', ''));
      card.addEventListener('mouseleave', clearStates);
    });
  }

  // ── Buttons → HAPPY ───────────────────────────────────────
  function bindButtons() {
    document.querySelectorAll('.btn-primary, .btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => setEmotion('cursor-happy', '🚀'));
      btn.addEventListener('mouseleave', clearStates);
    });
  }

  // ── Inputs → FOCUS ────────────────────────────────────────
  function bindInputs() {
    document.querySelectorAll('input, textarea, select').forEach(inp => {
      inp.addEventListener('focus',  () => setEmotion('cursor-focus', ''));
      inp.addEventListener('blur',   clearStates);
    });
  }

  // ── Images → ZOOM ─────────────────────────────────────────
  function bindImages() {
    document.querySelectorAll('.gear-card-img, .gear-detail-img').forEach(img => {
      img.addEventListener('mouseenter', () => setEmotion('cursor-zoom', '🔍'));
      img.addEventListener('mouseleave', clearStates);
    });
  }

  // ── General hover ─────────────────────────────────────────
  function bindHover() {
    document.querySelectorAll('a, button, [role="button"], .category-tab, .nav-link').forEach(el => {
      if (el.closest('.gear-card') || el.closest('.btn-primary')) return; // already handled
      el.addEventListener('mouseenter', () => {
        if (!document.body.classList.contains('cursor-excited') &&
            !document.body.classList.contains('cursor-happy')   &&
            !document.body.classList.contains('cursor-focus')   &&
            !document.body.classList.contains('cursor-zoom')) {
          setEmotion('cursor-hover', '');
        }
      });
      el.addEventListener('mouseleave', () => {
        if (document.body.classList.contains('cursor-hover')) clearStates();
      });
    });
  }

  // ── Floating Emoji Trail ───────────────────────────────────
  function spawnFloatingEmoji(x, y, emoji) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    el.style.left = (x + (Math.random() * 30 - 15)) + 'px';
    el.style.top  = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ─────────────────────────────────────────────────────────────
  //  3D CARD TILT ENGINE
  // ─────────────────────────────────────────────────────────────
  function initTilt() {
    document.querySelectorAll('.gear-card:not(.unavailable)').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect    = card.getBoundingClientRect();
        const cx      = rect.left + rect.width  / 2;
        const cy      = rect.top  + rect.height / 2;
        const dx      = e.clientX - cx;
        const dy      = e.clientY - cy;
        const maxTilt = 12;
        const rotX    = (-dy / (rect.height / 2)) * maxTilt;
        const rotY    = ( dx / (rect.width  / 2)) * maxTilt;

        // Shine direction
        const shineX  = (dx / rect.width  + 0.5) * 100;
        const shineY  = (dy / rect.height + 0.5) * 100;
        const shine   = card.querySelector('.card-shine');
        if (shine) {
          shine.style.background = `
            radial-gradient(circle at ${shineX}% ${shineY}%,
              rgba(255,255,255,0.14) 0%,
              transparent 60%)`;
          shine.style.opacity = '1';
        }

        card.style.transition = 'box-shadow 0.1s ease';
        card.style.transform  = `
          perspective(800px)
          rotateX(${rotX}deg)
          rotateY(${rotY}deg)
          translateY(-6px)
          scale(1.01)
        `;

        // Dynamic shadow based on tilt direction
        const shadowX = (-rotY * 1.5).toFixed(1);
        const shadowY = ( rotX * 1.5 + 20).toFixed(1);
        const glowColor = card.dataset.category === 'cameras' ? '139,92,246'
                        : card.dataset.category === 'drones'  ? '6,182,212'
                        :                                       '245,158,11';
        card.style.boxShadow = `
          ${shadowX}px ${shadowY}px 60px rgba(0,0,0,0.6),
          0 0 0 1px rgba(255,255,255,0.08),
          0 0 50px rgba(${glowColor},0.2),
          inset 0 1px 0 rgba(255,255,255,0.08)
        `;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
        card.style.transform  = '';
        card.style.boxShadow  = '';
        const shine = card.querySelector('.card-shine');
        if (shine) shine.style.opacity = '0';
      });

      // Click → wiggle emotion
      card.addEventListener('click', () => {
        spawnParticles(mouseX, mouseY);
        spawnFloatingEmoji(mouseX, mouseY, '🎬');
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  SCROLL REVEAL ENGINE
  // ─────────────────────────────────────────────────────────────
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal-hidden');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  // ─────────────────────────────────────────────────────────────
  //  SEARCH EMOTION
  // ─────────────────────────────────────────────────────────────
  function initSearchEmotion() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('focus', () => {
      searchInput.classList.add('emotion-focus');
    });
    searchInput.addEventListener('blur', () => {
      searchInput.classList.remove('emotion-focus');
    });
    searchInput.addEventListener('input', (e) => {
      if (e.target.value.length === 3) {
        spawnFloatingEmoji(mouseX, mouseY, '🔍');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT — Run after DOM ready, re-run after catalog renders
  // ─────────────────────────────────────────────────────────────
  function init() {
    bindGearCards();
    bindButtons();
    bindInputs();
    bindImages();
    bindHover();
    initTilt();
    initScrollReveal();
    initSearchEmotion();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-bind after catalog re-renders (cards loaded async)
  // Uses MutationObserver to detect when gear-grid is populated
  const gearGrid = document.getElementById('gear-grid');
  if (gearGrid) {
    const mo = new MutationObserver(() => {
      setTimeout(() => {
        bindGearCards();
        bindButtons();
        bindImages();
        initTilt();
      }, 50);
    });
    mo.observe(gearGrid, { childList: true });
  }

  // Expose for other scripts to trigger emotions manually
  window.GearEmotion = {
    spawn:   spawnFloatingEmoji,
    burst:   spawnParticles,
    setEmotion,
    clearStates,
  };

})();
