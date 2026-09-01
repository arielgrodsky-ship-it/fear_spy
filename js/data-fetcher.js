/**
 * Data Fetcher Module
 * Reads market data from data.json (written by GitHub Actions every 15 min).
 * No CORS proxies needed — the file is served directly from GitHub Pages.
 */

/**
 * Fetch all market data from the static data.json file.
 * @returns {Promise<Object>} Market data object
 */
async function fetchAllData() {
  // Add a cache-busting query param so the browser always gets the latest file
  const url = `./data.json?t=${Date.now()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`data.json returned HTTP ${response.status}`);
  }

  const data = await response.json();

  // Validate required fields
  const required = ['xlpspy', 'xlu', 'xlyxlp', 'rsp', 'vix', 's5fi', 'timestamp'];
  const missing = required.filter(k => data[k] === undefined || data[k] === null);
  if (missing.length > 0) {
    throw new Error(`data.json missing fields: ${missing.join(', ')}`);
  }

  // Validate all numeric fields are finite
  const numericFields = ['xlpspy', 'xlu', 'xlyxlp', 'rsp', 'vix', 's5fi'];
  const invalid = numericFields.filter(k => !Number.isFinite(data[k]));
  if (invalid.length > 0) {
    throw new Error(`data.json has non-numeric values for: ${invalid.join(', ')}`);
  }

  return data;
}

export { fetchAllData };
