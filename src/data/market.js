const demoSnapshot = {
  refreshedAt: '09:42:18 ET',
  score: 38,
  verdict: 'Mixed signals, narrow leadership.',
  summary: 'Participation is slipping while defensive sectors quietly take the lead. The index is holding up, but its foundation is less broad than it looks.',
  signals: [
    { symbol: 'XLP / SPY', name: 'Defensive rotation', value: '+0.42%', tone: 'caution', note: 'Risk-off' },
    { symbol: 'XLU', name: 'Utilities demand', value: '+0.81%', tone: 'caution', note: 'Defensive' },
    { symbol: 'S5FI', name: 'Stocks above 50D MA', value: '46.2%', tone: 'neutral', note: 'Narrowing' },
    { symbol: 'XLY / XLP', name: 'Risk appetite', value: '-0.28%', tone: 'negative', note: 'Fading' },
    { symbol: 'RSP', name: 'Equal-weight breadth', value: '-0.14%', tone: 'negative', note: 'Lagging' },
    { symbol: 'VIX', name: 'Fear index', value: '16.8', tone: 'positive', note: 'Contained' },
  ],
};

export async function loadMarketSnapshot(signal) {
  try {
    const response = await fetch('/api/market', { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Market API returned ${response.status}`);
    return await response.json();
  } catch {
    return { ...demoSnapshot, source: 'demo fallback' };
  }
}

export { demoSnapshot };
