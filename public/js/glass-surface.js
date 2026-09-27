/* ============================================================
   GlassSurface — Component (Vanilla JS & Web Component)
   Injects SVG displacement filter & chromatic aberration for
   ultra-realistic optical glass distortion.

   Usage in JS:
     new GlassSurface('#my-el', {
       width: 300,
       height: 200,
       borderRadius: 24,
       className: 'my-custom-class',
       displace: 15,
       distortionScale: -150,
       redOffset: 5,
       greenOffset: 15,
       blueOffset: 25,
       brightness: 60,
       opacity: 0.8,
       mixBlendMode: 'screen'
     });

   Usage in HTML:
     <glass-surface width="300" height="200" border-radius="24">
       <h2>Glass Surface Content</h2>
     </glass-surface>
   ============================================================ */

class GlassSurface {
  constructor(selector, options = {}) {
    this.el = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    if (!this.el) return;

    const {
      displace        = 10,
      distortionScale = -100,
      redOffset       = 3,
      greenOffset     = 10,
      blueOffset      = 18,
      brightness      = 50,
      opacity         = 0.85,
      mixBlendMode    = 'normal',
      borderRadius    = 24,
      width           = null,
      height          = null,
      className       = '',
    } = options;

    // Unique filter ID for this instance
    this._id = `gs-${Math.random().toString(36).slice(2, 8)}`;

    this._injectFilter({
      displace,
      distortionScale,
      redOffset,
      greenOffset,
      blueOffset,
      brightness,
      opacity,
    });

    this._applyStyles({
      width,
      height,
      borderRadius,
      opacity,
      mixBlendMode,
      className,
      displace,
    });
  }

  _injectFilter({ displace, distortionScale, redOffset, greenOffset, blueOffset, brightness, opacity }) {
    if (document.getElementById(this._id + '-svg')) return;

    const brSlope  = 1 + (brightness || 0) / 100;
    const redR     = (redOffset   || 0) / 100;
    const greenG   = (greenOffset || 0) / 100;
    const blueB    = (blueOffset  || 0) / 100;
    const scaleVal = displace || 10;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = this._id + '-svg';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;';

    svg.innerHTML = `
      <defs>
        <filter id="${this._id}"
          x="-20%" y="-20%" width="140%" height="140%"
          color-interpolation-filters="sRGB">

          <!-- Smooth organic glass refraction waves -->
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035 0.04"
            numOctaves="2"
            seed="7"
            result="noise"/>

          <!-- Primary refraction displacement -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="${scaleVal}"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"/>

          <!-- Chromatic aberration: split RGB channels -->
          <feColorMatrix
            in="displaced"
            type="matrix"
            values="
              1 0 0 0 ${redR}
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 ${opacity} 0"
            result="redChannel"/>

          <feColorMatrix
            in="displaced"
            type="matrix"
            values="
              0 0 0 0 0
              0 1 0 0 ${greenG}
              0 0 0 0 0
              0 0 0 ${opacity} 0"
            result="greenChannel"/>

          <feColorMatrix
            in="displaced"
            type="matrix"
            values="
              0 0 0 0 0
              0 0 0 0 0
              0 0 1 0 ${blueB}
              0 0 0 ${opacity} 0"
            result="blueChannel"/>

          <!-- Merge separated chromatic color bands -->
          <feMerge result="chromatic">
            <feMergeNode in="redChannel"/>
            <feMergeNode in="greenChannel"/>
            <feMergeNode in="blueChannel"/>
          </feMerge>

          <!-- Specular brightness boost for crystal glow -->
          <feComponentTransfer in="chromatic" result="brightened">
            <feFuncR type="linear" slope="${brSlope}"/>
            <feFuncG type="linear" slope="${brSlope}"/>
            <feFuncB type="linear" slope="${brSlope}"/>
          </feComponentTransfer>
        </filter>
      </defs>
    `;

    document.body.appendChild(svg);
    this._svgEl = svg;
  }

  _applyStyles({ width, height, borderRadius, opacity, mixBlendMode, className, displace }) {
    this.el.classList.add('glass-surface');
    if (className) this.el.classList.add(...className.split(' ').filter(Boolean));

    if (width) {
      this.el.style.width = typeof width === 'number' ? width + 'px' : width;
    }
    if (height) {
      this.el.style.height = typeof height === 'number' ? height + 'px' : height;
    }
    if (borderRadius) {
      const br = typeof borderRadius === 'number' ? borderRadius + 'px' : borderRadius;
      this.el.style.borderRadius = br;
    }

    this.el.style.setProperty('--glass-filter', `url(#${this._id})`);

    // Add lens refraction layer if not present
    if (!this.el.querySelector('.glass-surface-lens')) {
      const lens = document.createElement('div');
      lens.className = 'glass-surface-lens';
      lens.style.cssText = `
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        filter: url(#${this._id});
        mix-blend-mode: ${mixBlendMode || 'normal'};
        opacity: ${opacity || 0.85};
        background: radial-gradient(120% 120% at 20% 20%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 60%, transparent 100%);
        z-index: 1;
      `;
      this.el.prepend(lens);
    }

    // Wrap remaining children in sharp content layer
    if (!this.el.querySelector('.glass-surface-content')) {
      const content = document.createElement('div');
      content.className = 'glass-surface-content';
      content.style.cssText = `
        position: relative;
        z-index: 2;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 10px;
      `;
      const children = Array.from(this.el.childNodes).filter(node => !node.classList || !node.classList.contains('glass-surface-lens'));
      children.forEach(child => content.appendChild(child));
      this.el.appendChild(content);
    }
  }

  destroy() {
    if (this._svgEl) this._svgEl.remove();
    this.el.classList.remove('glass-surface');
  }
}

// ── Web Component Definition ──────────────────────────────────
class GlassSurfaceElement extends HTMLElement {
  connectedCallback() {
    // Delay slightly to let child DOM nodes be ready
    setTimeout(() => {
      if (this._initialized) return;
      this._initialized = true;

      const opts = {
        width:           this.getAttribute('width') || (this.style.width || null),
        height:          this.getAttribute('height') || (this.style.height || null),
        borderRadius:    this.getAttribute('border-radius') || this.getAttribute('borderRadius') || 24,
        className:       this.getAttribute('class-name') || this.getAttribute('className') || '',
        displace:        parseFloat(this.getAttribute('displace')) || 10,
        distortionScale: parseFloat(this.getAttribute('distortion-scale') || this.getAttribute('distortionScale')) || -100,
        redOffset:       parseFloat(this.getAttribute('red-offset') || this.getAttribute('redOffset')) || 3,
        greenOffset:     parseFloat(this.getAttribute('green-offset') || this.getAttribute('greenOffset')) || 10,
        blueOffset:      parseFloat(this.getAttribute('blue-offset') || this.getAttribute('blueOffset')) || 18,
        brightness:      parseFloat(this.getAttribute('brightness')) || 50,
        opacity:         parseFloat(this.getAttribute('opacity')) || 0.85,
        mixBlendMode:    this.getAttribute('mix-blend-mode') || this.getAttribute('mixBlendMode') || 'normal'
      };

      new GlassSurface(this, opts);
    }, 10);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('glass-surface')) {
  customElements.define('glass-surface', GlassSurfaceElement);
}

// ── Auto-init for data-glass elements ─────────────────────────
function initGlassSurfaces() {
  document.querySelectorAll('[data-glass]').forEach(el => {
    if (el._gsInit) return;
    el._gsInit = true;
    const opts = {};
    if (el.dataset.glassDisplace)       opts.displace        = +el.dataset.glassDisplace;
    if (el.dataset.glassDistortion)     opts.distortionScale = +el.dataset.glassDistortion;
    if (el.dataset.glassRed)            opts.redOffset       = +el.dataset.glassRed;
    if (el.dataset.glassGreen)          opts.greenOffset     = +el.dataset.glassGreen;
    if (el.dataset.glassBlue)           opts.blueOffset      = +el.dataset.glassBlue;
    if (el.dataset.glassBrightness)     opts.brightness      = +el.dataset.glassBrightness;
    if (el.dataset.glassOpacity)        opts.opacity         = +el.dataset.glassOpacity;
    if (el.dataset.glassBorderRadius)   opts.borderRadius    = el.dataset.glassBorderRadius;
    new GlassSurface(el, opts);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlassSurfaces);
} else {
  initGlassSurfaces();
}

// Exports
if (typeof module !== 'undefined') module.exports = GlassSurface;
window.GlassSurface = GlassSurface;
