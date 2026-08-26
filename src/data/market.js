const PROXIES = [
  url => url,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
];

const demoSnapshot = {
  refreshedAt: '09:42:18 ET', score: 38, verdict: 'Mixed signals, narrow leadership.',
  summary: 'Participation is slipping while defensive sectors quietly take the lead. The index is holding up, but its foundation is less broad than it looks.',
  signals: [
    { symbol: 'XLP / SPY', name: 'Defensive rotation', value: '+0.42%', tone: 'caution', note: 'Risk-off' },
    { symbol: 'XLU', name: 'Utilities demand', value: '+0.81%', tone: 'caution', note: 'Defensive' },
    { symbol: 'VIX', name: 'Fear index', value: '16.8', tone: 'negative', note: 'Contained' },
    { symbol: 'XLY / XLP', name: 'Risk appetite', value: '-0.28%', tone: 'negative', note: 'Fading' },
    { symbol: 'RSP', name: 'Equal-weight breadth', value: '-0.14%', tone: 'negative', note: 'Lagging' },
    { symbol: 'S5TH', name: 'Stocks above 200D MA', value: '58.4%', tone: 'neutral', note: 'Long-term' },
    { symbol: 'S5FI', name: 'Stocks above 50D MA', value: '46.2%', tone: 'neutral', note: 'Narrowing' },
  ],
};

const cache = {};
async function fetchChange(symbol) {
  if (cache[symbol]) return cache[symbol];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  cache[symbol] = (async () => {
    let lastError;
    for (const makeProxy of PROXIES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(makeProxy(url), { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const json = raw.contents ? JSON.parse(raw.contents) : raw;
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(value => value != null);
        if (!closes || closes.length < 2) throw new Error('Not enough data');
        return ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
      } catch (error) { lastError = error; } finally { clearTimeout(timeout); }
    }
    throw lastError;
  })();
  return cache[symbol];
}

async function fetchBreadthValue() {
  const url = 'https://www.tradingview.com/symbols/INDEX-S5FI/';
  for (const makeProxy of PROXIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(makeProxy(url), { signal: controller.signal });
      const html = await response.text();
      const match = html.match(/"price"\s*:\s*(?:"([\d.]+)"|([\d.]+))/);
      const value = match ? Number(match[1] ?? match[2]) : NaN;
      if (Number.isFinite(value)) return value;
    } catch { /* try the next source */ } finally { clearTimeout(timeout); }
  }
  throw new Error('Breadth unavailable');
}

const scoreSignal = (change, bullish) => 10 + (((change >= 0) === bullish ? 1 : -1) * Math.min(Math.abs(change), 2) * 5);

export async function loadMarketSnapshot(signal) {
  try {
    const [spy, xlp, xlu, xly, rsp, vix, s5fi] = await Promise.all([
      fetchChange('SPY'), fetchChange('XLP'), fetchChange('XLU'), fetchChange('XLY'),
      fetchChange('RSP'), fetchChange('^VIX'), fetchBreadthValue(),
    ]);
    const ratio = (numerator, denominator) => ((1 + numerator / 100) / (1 + denominator / 100) - 1) * 100;
    const changes = { spy, xlp, xlu, xly, rsp, vix, xlpspy: ratio(xlp, spy), xlyxlp: ratio(xly, xlp) };
    const score = Math.round(([scoreSignal(changes.xlpspy, true), scoreSignal(changes.xlyxlp, false), scoreSignal(vix, false), scoreSignal(rsp, true), scoreSignal(spy, true)].reduce((total, value) => total + value, 0) / 100) * 100);
    return { ...demoSnapshot, score, refreshedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), signals: demoSnapshot.signals.map(item => ({ ...item, value: item.symbol === 'XLP / SPY' ? `${changes.xlpspy >= 0 ? '+' : ''}${changes.xlpspy.toFixed(2)}%` : item.symbol === 'XLU' ? `${xlu >= 0 ? '+' : ''}${xlu.toFixed(2)}%` : item.symbol === 'VIX' ? vix.toFixed(2) : item.symbol === 'XLY / XLP' ? `${changes.xlyxlp >= 0 ? '+' : ''}${changes.xlyxlp.toFixed(2)}%` : item.symbol === 'RSP' ? `${rsp >= 0 ? '+' : ''}${rsp.toFixed(2)}%` : item.symbol === 'S5FI' ? `${s5fi.toFixed(2)}%` : item.value })) };
  } catch {
    return { ...demoSnapshot, source: 'demo fallback' };
  }
}

export { demoSnapshot };
