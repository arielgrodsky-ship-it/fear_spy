/**
 * Data Fetcher Module
 * Centralized logic for fetching market data with retry and error handling
 */

const CONFIG = {
  FETCH_TIMEOUT: 5000,
  CORSPROXY_URLS: [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => url  // Direct fetch as last resort
  ],
  POLL_INTERVAL: 60000, // 1 minute
};

/**
 * Attempts to fetch from a URL using multiple CORS proxies
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithProxies(url, options = {}) {
  let lastError;
  
  for (const makeUrl of CONFIG.CORSPROXY_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);
    
    try {
      const response = await fetch(makeUrl(url), {
        signal: controller.signal,
        ...options
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  throw lastError || new Error('All CORS proxies failed');
}

/**
 * Fetch daily percentage change for a stock symbol
 * @param {string} symbol - Stock symbol (e.g., 'SPY', '^VIX')
 * @returns {Promise<number>} - Percentage change
 */
async function fetchChange(symbol) {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetchWithProxies(yahooUrl, { 
      headers: { Accept: 'application/json' } 
    });
    
    const raw = await response.json();
    const json = raw.contents ? JSON.parse(raw.contents) : raw;
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    const valid = (closes || []).filter(v => v != null);
    
    if (valid.length < 2) {
      throw new Error('Insufficient data');
    }
    
    return ((valid.at(-1) - valid.at(-2)) / valid.at(-2)) * 100;
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    throw new Error(`Failed to fetch ${symbol}: ${error.message}`);
  }
}

/**
 * Fetch S5FI breadth value
 * @returns {Promise<number>} - S5FI percentage value
 */
async function fetchBreadth() {
  try {
    const pageUrl = 'https://www.tradingview.com/symbols/INDEX-S5FI/';
    const response = await fetchWithProxies(pageUrl, { 
      headers: { Accept: 'text/html' } 
    });
    
    const html = await response.text();
    const values = [...html.matchAll(/"price"\s*:\s*(?:"([\d.]+)"|([\d.]+))/g)]
      .map(match => Number(match[1] ?? match[2]))
      .filter(Number.isFinite);
    
    const value = values.at(-1);
    if (!Number.isFinite(value)) {
      throw new Error('S5FI price not found in response');
    }
    
    return value;
  } catch (error) {
    console.error('Failed to fetch S5FI:', error);
    throw new Error(`Failed to fetch breadth: ${error.message}`);
  }
}

/**
 * Calculate ratio change between two assets
 * @param {number} numeratorChange - Numerator daily change %
 * @param {number} denominatorChange - Denominator daily change %
 * @returns {number} - Ratio change %
 */
function calculateRatio(numeratorChange, denominatorChange) {
  return ((1 + numeratorChange / 100) / (1 + denominatorChange / 100) - 1) * 100;
}

/**
 * Fetch all market data in parallel
 * @returns {Promise<Object>} - Market data object
 */
async function fetchAllData() {
  const results = await Promise.allSettled([
    fetchChange('SPY'),
    fetchChange('XLP'),
    fetchChange('XLU'),
    fetchChange('XLY'),
    fetchChange('RSP'),
    fetchChange('^VIX'),
    fetchBreadth()
  ]);
  
  // Check for failures
  const failures = results
    .map((r, i) => ({ index: i, reason: r.status === 'rejected' ? r.reason : null }))
    .filter(r => r.reason);
  
  if (failures.length > 0) {
    throw new Error(`${failures.length} of 7 data sources failed`);
  }
  
  const [spy, xlp, xlu, xly, rsp, vix, s5fi] = results.map(r => r.value);
  
  return {
    xlpspy: calculateRatio(xlp, spy),
    xlu,
    xlyxlp: calculateRatio(xly, xlp),
    rsp,
    vix,
    s5fi,
    timestamp: new Date().toISOString()
  };
}

export { fetchChange, fetchBreadth, fetchAllData, calculateRatio, CONFIG };
