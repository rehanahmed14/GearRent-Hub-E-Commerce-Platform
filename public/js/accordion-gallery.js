/* ============================================================
   AccordionGallery — Vanilla JS (converted from React)
   Usage:
     new AccordionGallery('#container', {
       items: [{ image, label, sublabel, link, category }],
       defaultIndex: 2,
       expandRatio: 0.52,
       trigger: 'hover'  // or 'click'
     });
   ============================================================ */

class AccordionGallery {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    if (!this.container) return;

    this.items        = options.items        || [];
    this.defaultIndex = options.defaultIndex ?? Math.floor(this.items.length / 2);
    this.expandRatio  = options.expandRatio  ?? 0.52;
    this.trigger      = options.trigger      || 'hover';
    this.activeIndex  = this.defaultIndex;
    this.panels       = [];

    this._render();
    this._bindEvents();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'accordion-gallery';

    this.panels = this.items.map((item, i) => {
      const panel = document.createElement('div');
      panel.className = `ag-panel${i === this.activeIndex ? ' active' : ''}`;
      panel.style.backgroundImage = `url('${item.image}')`;
      panel.dataset.index = i;

      // CTA link
      const cta = document.createElement('a');
      cta.className = 'ag-cta';
      cta.href      = item.link || '#';
      cta.innerHTML = '→';
      cta.setAttribute('aria-label', `View ${item.label}`);

      // Label wrap
      const labelWrap = document.createElement('div');
      labelWrap.className = 'ag-label-wrap';

      const catEl = document.createElement('div');
      catEl.className = 'ag-label-category';
      catEl.textContent = item.category || 'Featured';

      const titleEl = document.createElement('div');
      titleEl.className = 'ag-label-title';
      titleEl.textContent = item.label;

      const priceEl = document.createElement('div');
      priceEl.className = 'ag-label-price';
      priceEl.innerHTML = `<span>💰</span>${item.sublabel || 'View Details'}`;

      labelWrap.append(catEl, titleEl, priceEl);
      panel.append(cta, labelWrap);
      this.container.appendChild(panel);
      return panel;
    });

    // Dots
    this._dotsEl = document.createElement('div');
    this._dotsEl.className = 'ag-dots';
    this.items.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = `ag-dot${i === this.activeIndex ? ' active' : ''}`;
      dot.addEventListener('click', () => this._activate(i));
      this._dotsEl.appendChild(dot);
    });

    // Insert dots directly after the container in DOM without detaching container
    if (this.container.parentNode) {
      const oldDots = this.container.parentNode.querySelector('.ag-dots');
      if (oldDots) oldDots.remove();
      this.container.parentNode.insertBefore(this._dotsEl, this.container.nextSibling);
    }

    this._setWidths(this.activeIndex);
  }

  _setWidths(activeIdx) {
    const n    = this.items.length;
    if (n === 0) return;
    const eRat = this.expandRatio;
    const rRat = n > 1 ? (1 - eRat) / (n - 1) : 1;

    this.panels.forEach((panel, i) => {
      panel.style.flex = i === activeIdx ? eRat : rRat;
      panel.classList.toggle('active', i === activeIdx);
    });

    // Update dots
    if (this._dotsEl) {
      this._dotsEl.querySelectorAll('.ag-dot').forEach((d, i) => {
        d.classList.toggle('active', i === activeIdx);
      });
    }
  }

  _activate(idx) {
    this.activeIndex = idx;
    this._setWidths(idx);
  }

  _bindEvents() {
    const evt = this.trigger === 'hover' ? 'mouseenter' : 'click';

    this.panels.forEach((panel, i) => {
      panel.addEventListener(evt, () => this._activate(i));
    });

    if (this.trigger === 'hover') {
      this.container.addEventListener('mouseleave', () => {
        this._activate(this.defaultIndex);
      });
    }

    // Keyboard navigation
    this.container.setAttribute('tabindex', '0');
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this._activate(Math.min(this.activeIndex + 1, this.items.length - 1));
      if (e.key === 'ArrowLeft')  this._activate(Math.max(this.activeIndex - 1, 0));
    });

    // Auto-advance on mobile (touch)
    let touchStartX = 0;
    this.container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    this.container.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx >  50) this._activate(Math.max(this.activeIndex - 1, 0));
      if (dx < -50) this._activate(Math.min(this.activeIndex + 1, this.items.length - 1));
    });
  }

  // Public method: programmatically go to index
  goTo(idx) { this._activate(idx); }

  // Public method: auto-play
  autoPlay(intervalMs = 3000) {
    this._autoInterval = setInterval(() => {
      this._activate((this.activeIndex + 1) % this.items.length);
    }, intervalMs);
    return this;
  }

  stopAutoPlay() {
    clearInterval(this._autoInterval);
    return this;
  }
}

// Export for module use
if (typeof module !== 'undefined') module.exports = AccordionGallery;
window.AccordionGallery = AccordionGallery;
