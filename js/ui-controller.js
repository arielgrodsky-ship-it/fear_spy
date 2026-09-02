/**
 * UI Controller Module
 * Manages all DOM updates and user interactions
 */

class UIController {
  constructor() {
    this.isLoading = false;
    this.lastUpdate = null;
    this.boundRefreshHandler = null;
  }

  /**
   * Update individual signal pill
   */
  updatePill(id, value, bullish) {
    const pill = document.getElementById(id);
    if (!pill) return;
    const valueEl = pill.querySelector('.pill-val');
    if (!valueEl) return;

    if (value === null || !Number.isFinite(value)) {
      pill.className = 'sig-pill sig-pill--loading';
      valueEl.textContent = '...';
      return;
    }

    const directionMatches = (value >= 0) === bullish;
    const displayClass = directionMatches ? 'up' : 'down';
    
    pill.className = `sig-pill ${displayClass}`;
    valueEl.textContent = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  /**
   * Show error state for a pill
   */
  setPillError(id, message = 'Error') {
    const pill = document.getElementById(id);
    if (!pill) return;
    const valueEl = pill.querySelector('.pill-val');
    if (!valueEl) return;
    pill.className = 'sig-pill sig-pill--error';
    valueEl.textContent = 'N/A';
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
    const valueEl = pill.querySelector('.pill-val');
    if (valueEl) valueEl.textContent = `${value.toFixed(2)}%`;
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
      const [plainTitle, emphasizedTitle = ''] = verdict.title.split('<em>');
      const emphasizedText = emphasizedTitle.replace('</em>', '');
      const emphasis = document.createElement('em');
      emphasis.textContent = emphasizedText;
      verdictText.replaceChildren(document.createTextNode(plainTitle), emphasis);
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
    document.body.dataset.error = 'false';

    const banner = document.querySelector('.sentiment-banner');
    if (banner) banner.classList.remove('is-loaded');
    
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

    const banner = document.querySelector('.sentiment-banner');
    if (banner) {
      banner.classList.remove('is-loaded', 'is-refreshing');
    }

    const verdictText = document.querySelector('.sb-verdict-text');
    const subtitle = document.querySelector('.sb-subtitle');

    if (verdictText) {
      verdictText.replaceChildren(document.createTextNode('Data Unavailable - Check Connection'));
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
      const updated = document.createElement('span');
      updated.style.cssText = 'font-size: 11px; color: #666;';
      updated.textContent = `Updated ${timeText}`;
      timeEl.replaceChildren(updated);
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
    this.boundToggleHandler = null;
    this.init();
  }

  init() {
    if (!this.toggleButton) return;
    
    let saved = null;
    try {
      saved = localStorage.getItem('breadthview-theme');
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    this.apply(saved === 'dark' ? 'dark' : 'light');
    this.boundToggleHandler = () => this.toggle();
    this.toggleButton.addEventListener('click', this.boundToggleHandler);
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
    try {
      localStorage.setItem('breadthview-theme', next);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
    this.apply(next);
  }

  destroy() {
    if (this.toggleButton && this.boundToggleHandler) {
      this.toggleButton.removeEventListener('click', this.boundToggleHandler);
    }
  }
}

// Clock management
class ClockManager {
  constructor() {
    this.clock = document.getElementById('clock');
    this.interval = null;
    this.init();
  }

  init() {
    if (!this.clock) return;
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
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

  destroy() {
    if (this.interval) clearInterval(this.interval);
  }
}

// Ticker tape management
class TickerTapeManager {
  constructor() {
    this.track = document.getElementById('tapeTrack');
    this.animationFrame = null;
    this.boundVisibilityHandler = null;
    this.boundMouseEnterHandler = null;
    this.boundMouseLeaveHandler = null;
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
      if (!setW) return;
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
    const symbol = document.createElement('span');
    symbol.className = 'tape-sym';
    symbol.textContent = s;
    const dot = document.createElement('span');
    dot.className = 'tape-dot';
    dot.textContent = '.';
    const label = document.createElement('span');
    label.className = 'tape-lbl';
    label.textContent = l;
    el.append(symbol, dot, label);
    return el;
  }

  startAnimation(setW) {
    const PX_PER_SEC = 55;
    let pos = 0;
    let last = null;
    let paused = false;

    const parent = this.track.parentElement;
    this.boundMouseEnterHandler = () => { paused = true; };
    this.boundMouseLeaveHandler = () => { paused = false; };
    this.boundVisibilityHandler = () => { last = null; };
    parent.addEventListener('mouseenter', this.boundMouseEnterHandler);
    parent.addEventListener('mouseleave', this.boundMouseLeaveHandler);
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    const step = (ts) => {
      if (last !== null && !paused) {
        const delta = Math.min((ts - last) / 1000, 0.1);
        pos += PX_PER_SEC * delta;
        if (pos >= setW) pos -= setW;
        this.track.style.transform = `translateX(${-pos}px)`;
      }
      last = ts;
      this.animationFrame = requestAnimationFrame(step);
    };
    
    this.animationFrame = requestAnimationFrame(step);
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    const parent = this.track?.parentElement;
    if (parent) {
      parent.removeEventListener('mouseenter', this.boundMouseEnterHandler);
      parent.removeEventListener('mouseleave', this.boundMouseLeaveHandler);
    }
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }
}

export { UIController, ThemeManager, ClockManager, TickerTapeManager };