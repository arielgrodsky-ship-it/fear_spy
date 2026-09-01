/**
 * App Controller Module
 * Orchestrates data fetching, calculation, and UI updates
 */

import { fetchAllData } from './data-fetcher.js';
import { calculateSentiment, getVerdict, isCorrectionActive } from './sentiment-calculator.js';
import { UIController, ThemeManager, ClockManager, TickerTapeManager } from './ui-controller.js';

class BreadthViewApp {
  constructor() {
    this.ui = new UIController();
    this.theme = new ThemeManager();
    this.clock = new ClockManager();
    this.ticker = new TickerTapeManager();
    
    this.updateInterval = null;
    this.timeoutWarningTimeout = null;
    
    // Auto-refresh rate: how often to fetch fresh data (in milliseconds)
    // Default: 30000ms = 30 seconds (adjust to your preference)
    // Production use: 60000ms = 1 minute or higher to avoid rate limits
    this.pollRate = 30000;
  }

  /**
   * Initialize and start the app
   */
  async init() {
    console.log('BreadthView starting...');
    this.fetchAndUpdate();
    
    // Poll for updates
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), this.pollRate);
  }

  /**
   * Fetch data and update UI
   */
  async fetchAndUpdate() {
    this.ui.showLoading();
    
    // Add visual refresh pulse
    const banner = document.querySelector('.sentiment-banner');
    if (banner) banner.classList.add('is-refreshing');
    
    // Show warning if taking too long
    this.timeoutWarningTimeout = setTimeout(() => {
      this.ui.showTimeoutWarning();
    }, 4000);

    try {
      const data = await fetchAllData();
      clearTimeout(this.timeoutWarningTimeout);
      
      this.updateUI(data);
      this.ui.showReady();
      this.ui.updateTimestamp(data.timestamp);
      
      // Remove refresh pulse
      if (banner) {
        banner.classList.remove('is-refreshing');
        banner.classList.add('is-loaded');
      }
      
      // Log correction status
      const { conditions } = calculateSentiment(data);
      console.log('Market status:', {
        correctionActive: isCorrectionActive(conditions),
        conditions,
        data
      });
    } catch (error) {
      clearTimeout(this.timeoutWarningTimeout);
      this.ui.showError(
        `Unable to load market data. ${error.message} ` +
        `Please check your internet connection and try again.`
      );
      console.error('App error:', error);
      
      // Remove refresh pulse on error
      if (banner) banner.classList.remove('is-refreshing');
    }
  }

  /**
   * Update all UI elements with new data
   */
  updateUI(data) {
    // === Color Rules ===
    // VIX, XLU, XLP/SPY, XLY/XLP, RSP: up = green, down = red
    // S5FI: >50% = green, <50% = red
    
    // Update individual signal pills
    this.ui.updatePill('pill-xlpspy', data.xlpspy, true);   // up = green
    this.ui.updatePill('pill-xlu', data.xlu, true);         // up = green
    this.ui.updatePill('pill-xly', data.xlyxlp, true);      // up = green
    this.ui.updatePill('pill-rsp', data.rsp, true);         // up = green
    this.ui.updatePill('pill-vix', data.vix, true);         // up = green
    
    // Update breadth with special coloring: >50% = green, <50% = red
    this.ui.updateBreadthPill(data.s5fi);

    // Calculate and update sentiment
    const { score, hasData } = calculateSentiment(data);
    
    if (!hasData) {
      this.ui.showError('Insufficient data received');
      return;
    }

    const verdict = getVerdict(score);
    this.ui.updateVerdict(verdict, score);
  }

  /**
   * Destroy app and clean up
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.timeoutWarningTimeout) {
      clearTimeout(this.timeoutWarningTimeout);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.breadthViewApp = new BreadthViewApp();
    window.breadthViewApp.init();
  });
} else {
  window.breadthViewApp = new BreadthViewApp();
  window.breadthViewApp.init();
}

export { BreadthViewApp };
