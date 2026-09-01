/**
 * Backend Configuration
 * Centralized settings for the market correction alert system
 */

export const CONFIG = {
  // Data fetching
  FETCH: {
    TIMEOUT_MS: 8000,
    MAX_RETRIES: 3,
    CORSPROXY_URLS: [
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      url => url
    ]
  },

  // Market data sources
  DATA_SOURCES: {
    YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart',
    TRADINGVIEW: 'https://www.tradingview.com/symbols/INDEX-S5FI/'
  },

  // Correction conditions - all must be true
  CORRECTION_CONDITIONS: {
    defensive_ratio_rising: 0,         // XLP/SPY > 0%
    utilities_rising: 0,               // XLU > 0%
    risk_appetite_falling: 0,          // XLY/XLP < 0%
    equal_weight_falling: 0,           // RSP < 0%
    volatility_rising: 0,              // VIX > 0%
    breadth_below_threshold: 50        // S5FI < 50%
  },

  // Alert channels (enable by adding credentials to environment)
  CHANNELS: {
    telegram: {
      enabled: () => !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
      config: () => ({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      })
    },
    sms: {
      enabled: () => {
        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SMS_TO } = process.env;
        return !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_FROM && !!SMS_TO;
      },
      config: () => ({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_FROM,
        to: process.env.SMS_TO
      })
    },
    whatsapp: {
      enabled: () => {
        const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO } = process.env;
        return !!WHATSAPP_ACCESS_TOKEN && !!WHATSAPP_PHONE_NUMBER_ID && !!WHATSAPP_TO;
      },
      config: () => ({
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        to: process.env.WHATSAPP_TO
      })
    }
  },

  // Message templates
  MESSAGES: {
    CORRECTION_ALERT: (data) => 
      `🚨 BreadthView Correction Alert\n\nAll correction conditions are met.\n\n${formatData(data)}\n\nTime: ${new Date().toISOString()}`,
    
    CORRECTION_RECOVERY: (data) => 
      `✅ BreadthView Alert Cleared\n\nThe full correction pattern is no longer active.\n\n${formatData(data)}\n\nTime: ${new Date().toISOString()}`,
    
    ERROR: (error) => 
      `⚠️ BreadthView Data Fetch Error\n\n${error}\n\nTime: ${new Date().toISOString()}`
  }
};

/**
 * Format market data for display
 */
function formatData(data) {
  return [
    `XLP/SPY:  ${data.xlpSpy.toFixed(2)}%`,
    `XLU:      ${data.xlu.toFixed(2)}%`,
    `XLY/XLP:  ${data.xlyXlp.toFixed(2)}%`,
    `RSP:      ${data.rsp.toFixed(2)}%`,
    `VIX:      ${data.vix.toFixed(2)}%`,
    `S5FI:     ${data.s5fi.toFixed(2)}%`
  ].join('\n');
}

/**
 * Get enabled channels
 */
export function getEnabledChannels() {
  return Object.entries(CONFIG.CHANNELS)
    .filter(([_, channel]) => channel.enabled())
    .map(([name, _]) => name);
}

/**
 * Structured logging
 */
export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry, null, 2));
  return logEntry;
}

export { formatData };
