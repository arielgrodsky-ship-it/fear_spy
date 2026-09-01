/**
 * UI Controller Module
 * Manages all DOM updates and user interactions
 */

class UIController {
  constructor() {
    this.isLoading = false;
    this.lastUpdate = null;
  }

  /**
   * Update individual signal pill
   */
  updatePill(id, value, bullish) {
    const pill = document.getElementById(id);
    if (!pill) return;

    if (value === null || !Number.isFinite(value)) {
      pill.className = 'sig-pill sig-pill--loading';
      pill.querySelector('.pill-val').textContent = '⋯';
      return;
    }

    const direction = value >= 0 ? 'up' : 'down';
    const isBullish = (value >= 0) === bullish;
    const displayClass = isBullish ? direction : `vix-${direction}`;
    
    pill.className = `sig-pill ${displayClass}`;
    pill.querySelector('.pill-val').textContent = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  /**
   * Show error state for a pill
   */
  setPillError(id, message = 'Error') {
    const pill = document.getElementById(id);
    if (!pill) return;
    pill.className = 'sig-pill sig-pill--error';
    pill.querySelector('.pill-val').textContent = 'N/A';
    pill.title = message;
  }

  /**
   * Update breadth/S5FI pill with special coloring
   */
  updateBreadthPill(value) {
    const pill = document.getElementById('pill-s5fi');
    if (!pill || !Number.isFinite(value)) {
      this.setPillError('pill-s5fi', 'Breadth data unavailable');
      return;
    }

    // S5FI Rule: >50% = green (breadth-low), <50% = red (breadth-high)
    const zone = value >= 50 ? 'breadth-low' : 'breadth-high';
    pill.className = `sig-pill ${zone}`;
    pill.querySelector('.pill-val').textContent = `${value.toFixed(2)}%`;
  }

  /**
   * Update sentiment verdict and score
   */
  updateVerdict(verdict, score) {
    const chip = document.querySelector('.sb-status-chip');
    const verdictText = document.querySelector('.sb-verdict-text');
    const subtitle = document.querySelector('.sb-subtitle');

    if (chip) {
      Object.assign(chip.style, {
        color: verdict.palette.c,
        background: verdict.palette.bg,
        borderColor: verdict.palette.b
      });
      chip.lastChild.textContent = ` ${verdict.status}`;
    }

    if (verdictText) {
      verdictText.innerHTML = verdict.title;
    }

    if (subtitle) {
      subtitle.textContent = verdict.subtitle;
    }

    this.updateGauge(score);
  }

  /**
   * Update sentiment gauge
   */
  updateGauge(score) {
    const arc = document.getElementById('gaugeArc');
    const number = document.querySelector('.gauge-num');
    const reading = document.querySelector('.gauge-reading');

    if (arc) {
      const circumference = 188.5;
      arc.style.strokeDashoffset = String(circumference * (1 - score / 100));
    }

    if (number) {
      number.textContent = String(Math.round(score));
    }

    if (reading) {
      if (score >= 70) reading.textContent = 'Bullish Zone';
      else if (score >= 60) reading.textContent = 'Constructive';
      else if (score >= 50) reading.textContent = 'Neutral';
      else if (score >= 40) reading.textContent = 'Caution Zone';
      else reading.textContent = 'Defensive';
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;
    document.body.dataset.loading = 'true';
    
    // Reset pills to loading state
    ['pill-xlpspy', 'pill-xlu', 'pill-xly', 'pill-rsp', 'pill-vix', 'pill-s5fi']
      .forEach(id => this.updatePill(id, null, false));
    
    // Show status
    const status = document.querySelector('.status-text');
    if (status) {
      status.textContent = 'LOADING';
    }
  }

  /**
   * Show error state
   */
  showError(message = 'Unable to load market data') {
    this.isLoading = false;
    document.body.dataset.loading = 'false';
    document.body.dataset.error = 'true';

    const verdictText = document.querySelector('.sb-verdict-text');
    const subtitle = document.querySelector('.sb-subtitle');

    if (verdictText) {
      verdictText.innerHTML = 'Data Unavailable — <em>Check Connection</em>';
    }

    if (subtitle) {
      subtitle.textContent = message;
    }

    const status = document.querySelector('.status-text');
    if (status) {
      status.textContent = 'ERROR';
    }

    console.error('UI Error:', message);
  }

  /**
   * Show ready state
   */
  showReady() {
    this.isLoading = false;
    document.body.dataset.loading = 'false';
    document.body.dataset.error = 'false';

    const status = document.querySelector('.status-text');
    if (status) {
      status.textContent = 'LIVE';
    }

    const banner = document.querySelector('.sentiment-banner');
    if (banner) {
      banner.classList.add('is-loaded');
    }
  }

  /**
   * Update last refresh time
   */
  updateTimestamp(timestamp) {
    this.lastUpdate = new Date(timestamp);
    const timeEl = document.querySelector('.workspace-bar-right');
    if (timeEl) {
      const minutes = Math.floor((Date.now() - this.lastUpdate.getTime()) / 60000);
      const timeText = minutes === 0 ? 'just now' : `${minutes}m ago`;
      timeEl.innerHTML = `<span style="font-size: 11px; color: #666;">Updated ${timeText}</span>`;
    }
  }

  /**
   * Show timeout warning
   */
  setRefreshButtonSpinning(spinning) {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;
    btn.disabled = spinning;
    btn.classList.toggle('is-spinning', spinning);
  }

  showTimeoutWarning() {
    const subtitle = document.querySelector('.sb-subtitle');
    if (subtitle) {
      const warning = ' (⚠ Taking longer than usual to load data)';
      if (!subtitle.textContent.includes('⚠')) {
        subtitle.textContent += warning;
      }
    }
  }
}

// Theme management
class ThemeManager {
  constructor() {
    this.toggleButton = document.getElementById('themeToggle');
    this.init();
  }

  init() {
    if (!this.toggleButton) return;
    
    const saved = localStorage.getItem('breadthview-theme');
    this.apply(saved === 'dark' ? 'dark' : 'light');
    this.toggleButton.addEventListener('click', () => this.toggle());
  }

  apply(mode) {
    const dark = mode === 'dark';
    document.body.dataset.theme = dark ? 'dark' : 'light';
    
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      const icon = this.toggleButton.querySelector('.theme-toggle-icon');
      const label = this.toggleButton.querySelector('.theme-toggle-label');
      if (icon) icon.textContent = dark ? '☀' : '☾';
      if (label) label.textContent = dark ? 'Light' : 'Dark';
    }
  }

  toggle() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('breadthview-theme', next);
    this.apply(next);
  }
}

// Clock management
class ClockManager {
  constructor() {
    this.clock = document.getElementById('clock');
    this.init();
  }

  init() {
    if (!this.clock) return;
    this.tick();
    setInterval(() => this.tick(), 1000);
  }

  tick() {
    const et = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem'
    });
    this.clock.textContent = et + ' ILT';
  }
}

// Ticker tape management
class TickerTapeManager {
  constructor() {
    this.track = document.getElementById('tapeTrack');
    this.items = [
      { s: 'XLP/SPY', l: 'Defensive Ratio' },
      { s: 'XLU', l: 'Utilities ETF' },
      { s: 'XLY/XLP', l: 'Risk Appetite' },
      { s: 'RSP', l: 'Equal Weight ETF' },
      { s: 'S5FI', l: '% Above 50D' },
      { s: 'SPY', l: 'S&P 500 ETF' },
      { s: 'QQQ', l: 'NASDAQ 100 ETF' },
      { s: 'IWM', l: 'Russell 2000' },
      { s: 'DIA', l: 'Dow Jones ETF' },
      { s: 'GLD', l: 'Gold ETF' },
      { s: 'TLT', l: '20Y Treasury ETF' },
      { s: 'HYG', l: 'High Yield Bonds' }
    ];
    this.init();
  }

  init() {
    if (!this.track) return;

    this.items.forEach(item => this.track.appendChild(this.makeItem(item)));

    (document.fonts?.ready || Promise.resolve()).then(() => {
      const setW = this.track.scrollWidth;
      const needed = Math.ceil(window.innerWidth * 3 / setW) + 1;
      for (let i = 0; i < needed; i++) {
        this.items.forEach(item => this.track.appendChild(this.makeItem(item)));
      }
      this.startAnimation(setW);
    });
  }

  makeItem({ s, l }) {
    const el = document.createElement('span');
    el.className = 'tape-item';
    el.innerHTML = `<span class="tape-sym">${s}</span><span class="tape-dot">·</span><span class="tape-lbl">${l}</span>`;
    return el;
  }

  startAnimation(setW) {
    const PX_PER_SEC = 55;
    let pos = 0;
    let last = null;
    let paused = false;

    this.track.parentElement.addEventListener('mouseenter', () => { paused = true; });
    this.track.parentElement.addEventListener('mouseleave', () => { paused = false; });
    document.addEventListener('visibilitychange', () => { last = null; });

    const step = (ts) => {
      if (last !== null && !paused) {
        const delta = Math.min((ts - last) / 1000, 0.1);
        pos += PX_PER_SEC * delta;
        if (pos >= setW) pos -= setW;
        this.track.style.transform = `translateX(${-pos}px)`;
      }
      last = ts;
      requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
  }
}

export { UIController, ThemeManager, ClockManager, TickerTapeManager };