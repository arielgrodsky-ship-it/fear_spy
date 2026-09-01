import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG, getEnabledChannels, log, formatData } from './config.mjs';

const statePath  = new URL('./state.json',  import.meta.url);
const dataPath   = new URL('./data.json',   import.meta.url);

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH.TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchChange(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const json = await fetchJson(url);
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null);
  if (!closes || closes.length < 2) throw new Error(`${symbol}: insufficient data`);
  return ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
}

async function fetchS5FI() {
  // Yahoo Finance doesn't have S5FI directly — scrape TradingView
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH.TIMEOUT_MS);
  try {
    const response = await fetch('https://www.tradingview.com/symbols/INDEX-S5FI/', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BreadthView/1.0)' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const prices = [...html.matchAll(/"price"\s*:\s*(?:"([\d.]+)"|([\d.]+))/g)]
      .map(m => Number(m[1] ?? m[2]))
      .filter(Number.isFinite);
    const value = prices.at(-1);
    if (Number.isFinite(value)) return value;
    throw new Error('S5FI price not found in page');
  } finally {
    clearTimeout(timeout);
  }
}

// ─── State & data persistence ────────────────────────────────────────────────

async function loadState() {
  try { return JSON.parse(await readFile(statePath, 'utf8')); }
  catch { return { correctionActive: false }; }
}

async function saveState(state) {
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * Write market data as a static JSON file that GitHub Pages will serve.
 * The frontend reads this instead of hitting Yahoo/TradingView directly.
 */
async function saveDataJson(data) {
  const payload = {
    xlpspy:    data.xlpSpy,
    xlu:       data.xlu,
    xlyxlp:    data.xlyXlp,
    rsp:       data.rsp,
    vix:       data.vix,
    s5fi:      data.s5fi,
    timestamp: new Date().toISOString()
  };
  await writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`);
  log('info', 'data.json written', payload);
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

function ratio(num, den) {
  return ((1 + num / 100) / (1 + den / 100) - 1) * 100;
}

function evaluate(data) {
  const conditions = {
    defensiveRatioRising: data.xlpSpy > 0,
    utilitiesRising:      data.xlu > 0,
    riskAppetiteRising:   data.xlyXlp > 0,
    equalWeightRising:    data.rsp > 0,
    volatilityRising:     data.vix > 0,
    breadthBelow50:       data.s5fi < 50,
  };
  return { conditions, allMet: Object.values(conditions).every(Boolean) };
}

// ─── Alert channels ──────────────────────────────────────────────────────────

async function sendTelegram(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message }) }
  );
  if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
  return true;
}

async function sendSms(message) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from, SMS_TO: to } = process.env;
  if (!sid || !token || !from || !to) return false;
  const body = new URLSearchParams({ From: from, To: to, Body: message });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    { method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
                 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );
  if (!response.ok) throw new Error(`Twilio HTTP ${response.status}`);
  return true;
}

async function sendWhatsApp(message) {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId, WHATSAPP_TO: to } = process.env;
  if (!token || !phoneId || !to) return false;
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${phoneId}/messages`,
    { method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }) }
  );
  if (!response.ok) throw new Error(`WhatsApp HTTP ${response.status}`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

try {
  const [spy, xlp, xlu, xly, rsp, vix, s5fi] = await Promise.all([
    fetchChange('SPY'), fetchChange('XLP'), fetchChange('XLU'), fetchChange('XLY'),
    fetchChange('RSP'), fetchChange('^VIX'), fetchS5FI(),
  ]);

  const data = { xlpSpy: ratio(xlp, spy), xlu, xlyXlp: ratio(xly, xlp), rsp, vix, s5fi };

  // Always write data.json so the dashboard can read it from Pages
  await saveDataJson(data);

  const { allMet, conditions } = evaluate(data);
  const state = await loadState();
  const now = new Date().toISOString();

  log('info', 'Market data fetched', { allMet, conditions, enabledChannels: getEnabledChannels(), data });

  if (allMet && !state.correctionActive) {
    const message = `🚨 BreadthView Correction Alert\n\nAll correction conditions are met.\n\n${formatData(data)}\n\nChecked: ${now}`;
    const sent = await Promise.all([sendTelegram(message), sendSms(message), sendWhatsApp(message)]);
    log('alert', 'Correction pattern activated', { sentSuccessfully: sent.filter(Boolean).length, data });
    await saveState({ correctionActive: true, lastAlertAt: now, lastData: data });
  } else if (!allMet && state.correctionActive) {
    const recovery = `✅ BreadthView Alert Cleared\n\nThe full correction pattern is no longer active.\n\n${formatData(data)}\n\nChecked: ${now}`;
    const sent = await Promise.all([sendTelegram(recovery), sendSms(recovery), sendWhatsApp(recovery)]);
    log('recovery', 'Correction pattern cleared', { sentSuccessfully: sent.filter(Boolean).length, data });
    await saveState({ correctionActive: false, lastRecoveryAt: now, lastData: data });
  } else if (allMet && state.correctionActive) {
    log('info', 'Correction remains active', { state: 'sustained' });
  } else {
    log('info', 'No correction pattern', { state: 'normal' });
  }

} catch (error) {
  log('error', 'Market check failed', { errorMessage: error.message, errorStack: error.stack });
  const errorMessage = `⚠️ BreadthView Data Fetch Error\n\n${error.message}\n\nTime: ${new Date().toISOString()}`;
  try {
    await Promise.all([sendTelegram(errorMessage), sendSms(errorMessage), sendWhatsApp(errorMessage)]);
  } catch (alertError) {
    log('error', 'Failed to send error notification', { alertError: alertError.message });
  }
  process.exit(1); // Signal failure to GitHub Actions
}
