import { readFile, writeFile } from 'node:fs/promises';

const statePath = new URL('./state.json', import.meta.url);
const proxies = [
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => url,
];

async function fetchJson(url) {
  let lastError;
  for (const makeUrl of proxies) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(makeUrl(url), { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      return raw.contents ? JSON.parse(raw.contents) : raw;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchChange(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const json = await fetchJson(url);
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(value => value != null);
  if (!closes || closes.length < 2) throw new Error(`${symbol}: insufficient data`);
  return ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
}

async function fetchS5FI() {
  const url = 'https://www.tradingview.com/symbols/INDEX-S5FI/';
  for (const makeUrl of proxies) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(makeUrl(url), { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const match = html.match(/"price"\s*:\s*(?:"([\d.]+)"|([\d.]+))/);
      const value = match ? Number(match[1] ?? match[2]) : NaN;
      if (Number.isFinite(value)) return value;
    } catch {
      // Try the next source.
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('S5FI: value unavailable');
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    return { correctionActive: false };
  }
}

async function saveState(state) {
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function ratio(numerator, denominator) {
  return ((1 + numerator / 100) / (1 + denominator / 100) - 1) * 100;
}

function evaluate(data) {
  const conditions = {
    defensiveRatioRising: data.xlpSpy > 0,
    utilitiesRising: data.xlu > 0,
    riskAppetiteFalling: data.xlyXlp < 0,
    equalWeightFalling: data.rsp < 0,
    volatilityRising: data.vix > 0,
    breadthBelow60: data.s5fi < 60,
  };
  return { conditions, allMet: Object.values(conditions).every(Boolean) };
}

function formatData(data) {
  return [
    `XLP/SPY: ${data.xlpSpy.toFixed(2)}%`,
    `XLU: ${data.xlu.toFixed(2)}%`,
    `XLY/XLP: ${data.xlyXlp.toFixed(2)}%`,
    `RSP: ${data.rsp.toFixed(2)}%`,
    `VIX: ${data.vix.toFixed(2)}%`,
    `S5FI: ${data.s5fi.toFixed(2)}%`,
  ].join('\n');
}

async function sendTelegram(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message }),
  });
  if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
  return true;
}

async function sendSms(message) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from, SMS_TO: to } = process.env;
  if (!sid || !token || !from || !to) return false;
  const body = new URLSearchParams({ From: from, To: to, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!response.ok) throw new Error(`Twilio HTTP ${response.status}`);
  return true;
}

async function sendWhatsApp(message) {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId, WHATSAPP_TO: to } = process.env;
  if (!token || !phoneId || !to) return false;
  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
  });
  if (!response.ok) throw new Error(`WhatsApp HTTP ${response.status}`);
  return true;
}

const [spy, xlp, xlu, xly, rsp, vix, s5fi] = await Promise.all([
  fetchChange('SPY'), fetchChange('XLP'), fetchChange('XLU'), fetchChange('XLY'),
  fetchChange('RSP'), fetchChange('^VIX'), fetchS5FI(),
]);
const data = { xlpSpy: ratio(xlp, spy), xlu, xlyXlp: ratio(xly, xlp), rsp, vix, s5fi };
const { allMet, conditions } = evaluate(data);
const state = await loadState();
const now = new Date().toISOString();
const message = `BreadthView correction alert\n\nAll correction conditions are met.\n\n${formatData(data)}\n\nChecked: ${now}`;

console.log(JSON.stringify({ allMet, conditions, data }, null, 2));
if (allMet && !state.correctionActive) {
  const sent = await Promise.all([sendTelegram(message), sendSms(message), sendWhatsApp(message)]);
  console.log(`Correction alert sent through ${sent.filter(Boolean).length} configured channel(s).`);
  await saveState({ correctionActive: true, lastAlertAt: now, lastData: data });
} else if (!allMet && state.correctionActive) {
  const recovery = `BreadthView correction alert cleared\n\nThe full correction pattern is no longer active.\n\n${formatData(data)}\n\nChecked: ${now}`;
  const sent = await Promise.all([sendTelegram(recovery), sendSms(recovery), sendWhatsApp(recovery)]);
  console.log(`Recovery message sent through ${sent.filter(Boolean).length} configured channel(s).`);
  await saveState({ correctionActive: false, lastRecoveryAt: now, lastData: data });
} else {
  console.log(allMet ? 'Correction remains active; duplicate alert suppressed.' : 'No correction alert.');
}
