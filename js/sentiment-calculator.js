/**
 * Sentiment Calculator Module
 * Evaluates market conditions and calculates sentiment score
 */

const PALETTE = {
  pos: { 
    c: '#00ff66',        // Bright vibrant green
    bg: 'rgba(0,255,102,0.15)',  // Bright green background
    b: 'rgba(0,255,102,0.5)' // Bright green border
  },
  neg: { 
    c: '#ff3333',        // Bright vibrant red
    bg: 'rgba(255,51,51,0.15)',  // Bright red background
    b: 'rgba(255,51,51,0.5)' // Bright red border
  },
  neu: { 
    c: '#3399ff',        // Bright blue
    bg: 'rgba(51,153,255,0.15)', // Bright blue background
    b: 'rgba(51,153,255,0.4)' // Bright blue border
  },
  caution: { 
    c: '#ff9900',        // Bright orange
    bg: 'rgba(255,153,0,0.15)',  // Bright orange background
    b: 'rgba(255,153,0,0.4)' // Bright orange border
  }
};

/**
 * Evaluate correction conditions
 * @param {Object} data - Market data object
 * @returns {Object} - Conditions and allMet flag
 */
function evaluateConditions(data) {
  return {
    xlpspy: data.xlpspy > 0,      // XLP/SPY up = green (bullish)
    xlu: data.xlu > 0,            // XLU up = green (bullish)
    xlyxlp: data.xlyxlp > 0,      // XLY/XLP up = green (bullish)
    rsp: data.rsp > 0,            // RSP up = green (bullish)
    vix: data.vix > 0,            // VIX up = green (bullish signal of worry)
    breadth: data.s5fi < 50       // S5FI <50 = red (bearish, weak breadth)
  };
}

/**
 * Score a signal based on magnitude and direction
 * @param {number} pct - Percentage change
 * @param {boolean} bullish - Whether positive change is bullish
 * @returns {number} - Score 0-20
 */
function scoreSignal(pct, bullish) {
  const magnitude = Math.min(Math.abs(pct), 2);
  const direction = (pct >= 0) === bullish ? 1 : -1;
  return 10 + direction * magnitude * 5;
}

/**
 * Calculate overall sentiment score
 * @param {Object} data - Market data object
 * @returns {Object} - Score 0-100 and conditions
 */
function calculateSentiment(data) {
  const conditions = evaluateConditions(data);
  
  let total = 0;
  let count = 0;
  
  // Weight each signal
  const signals = [
    { value: data.xlpspy, bullish: false }, // Defensive ratio (inverted)
    { value: data.xlyxlp, bullish: true },  // Risk appetite
    { value: data.vix, bullish: false },    // Volatility
    { value: data.rsp, bullish: true },     // Participation
    { value: data.s5fi, bullish: true }     // Breadth (needs special handling)
  ];
  
  signals.forEach(({ value, bullish }) => {
    if (value != null && Number.isFinite(value)) {
      total += scoreSignal(value, bullish);
      count++;
    }
  });
  
  if (count === 0) {
    return { score: 50, conditions, hasData: false };
  }
  
  const score = Math.round((total / (count * 20)) * 100);
  const clamped = Math.max(0, Math.min(100, score));
  
  return { score: clamped, conditions, hasData: true };
}

/**
 * Get verdict text based on score
 * @param {number} score - Sentiment score 0-100
 * @returns {Object} - Verdict object with text and styling
 */
function getVerdict(score) {
  if (score >= 60) {
    return {
      title: 'Broad Participation — <em>Risk Appetite Intact</em>',
      subtitle: 'Breadth and risk appetite indicators are aligning positively, with participation broadening beneath headline index levels.',
      status: 'Constructive',
      palette: PALETTE.pos
    };
  } else if (score >= 40) {
    return {
      title: 'Mixed Signal — <em>Proceed with Caution</em>',
      subtitle: 'Defensive rotation and mixed breadth indicators suggest deteriorating internal momentum beneath headline index levels.',
      status: 'Elevated Caution',
      palette: PALETTE.caution
    };
  } else {
    return {
      title: 'Narrow Leadership — <em>Defensive Posture</em>',
      subtitle: 'Risk appetite is weakening across breadth and rotation measures. Defensive positioning is outpacing growth exposure.',
      status: 'Defensive',
      palette: PALETTE.neg
    };
  }
}

/**
 * Get reading label based on score
 * @param {number} score - Sentiment score 0-100
 * @returns {string}
 */
function getReadingLabel(score) {
  if (score >= 70) return 'Bullish Zone';
  if (score >= 60) return 'Constructive';
  if (score >= 50) return 'Neutral';
  if (score >= 40) return 'Caution Zone';
  return 'Defensive';
}

/**
 * Check if correction conditions are met
 * @param {Object} conditions - Conditions object
 * @returns {boolean}
 */
function isCorrectionActive(conditions) {
  return Object.values(conditions).every(Boolean);
}

export { 
  evaluateConditions, 
  calculateSentiment, 
  getVerdict, 
  getReadingLabel,
  isCorrectionActive,
  scoreSignal,
  PALETTE
};
