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
    this.isFetching = false;

    this.pollRate = 15 * 60 * 1000; // match GitHub Actions cadence
  }

  async init() {
    console.log('BreadthView starting...');
    this.bindRefreshButton();
    this.fetchAndUpdate();
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), this.pollRate);
  }

  bindRefreshButton() {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (this.isFetching) return;
      this.fetchAndUpdate();
    });
  }

  async fetchAndUpdate() {
    if (this.isFetching) return;
    this.isFetching = true;
    this.ui.showLoading();
    this.ui.setRefreshButtonSpinning(true);

    const banner = document.querySelector('.sentiment-banner');
    if (banner) banner.classList.add('is-refreshing');

    this.timeoutWarningTimeout = setTimeout(() => {
      this.ui.showTimeoutWarning();
    }, 4000);

    try {
      const data = await fetchAllData();
      clearTimeout(this.timeoutWarningTimeout);

      this.updateUI(data);
      this.ui.showReady();
      this.ui.updateTimestamp(data.timestamp);

      if (banner) {
        banner.classList.remove('is-refreshing');
        banner.classList.add('is-loaded');
      }

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
        `GitHub Actions updates data every 15 minutes. If the file is missing, run the workflow manually from the Actions tab.`
      );
      console.error('App error:', error);
      if (banner) banner.classList.remove('is-refreshing');
    } finally {
      this.isFetching = false;
      this.ui.setRefreshButtonSpinning(false);
    }
  }

  updateUI(data) {
    this.ui.updatePill('pill-xlpspy', data.xlpspy, true);
    this.ui.updatePill('pill-xlu', data.xlu, true);
    this.ui.updatePill('pill-xly', data.xlyxlp, true);
    this.ui.updatePill('pill-rsp', data.rsp, true);
    this.ui.updatePill('pill-vix', data.vix, true);
    this.ui.updateBreadthPill(data.s5fi);

    const { score, hasData } = calculateSentiment(data);
    if (!hasData) {
      this.ui.showError('Insufficient data received');
      return;
    }

    const verdict = getVerdict(score);
    this.ui.updateVerdict(verdict, score);
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.timeoutWarningTimeout) clearTimeout(this.timeoutWarningTimeout);
  }
}

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