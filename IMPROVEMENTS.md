# BreadthView Improvements

## Summary of Changes

This update refactors BreadthView with better code organization, error handling, UI/UX improvements, and backend enhancements.

### 📦 Frontend Improvements

#### Code Quality & Organization
- ✅ **Modular Architecture**: Extracted monolithic scripts into separate ES6 modules
  - `js/data-fetcher.js` - Centralized data fetching with CORS proxy logic
  - `js/sentiment-calculator.js` - Market analysis and sentiment scoring
  - `js/ui-controller.js` - DOM management and UI state
  - `js/app.js` - Main application orchestrator

- ✅ **Reduced Duplication**: Removed repeated CORS proxy URLs and fetch logic
- ✅ **Better Code Structure**: Separated concerns (data, logic, UI)

#### Error Handling & Robustness
- ✅ **Loading States**: Pills show animated loading state while data loads
- ✅ **Error Messages**: User-friendly error messages instead of silent failures
- ✅ **Timeout Warnings**: Visual indicator if data takes >4 seconds
- ✅ **Graceful Degradation**: App continues to function even if some data sources fail
- ✅ **Network Error Recovery**: Better handling of CORS proxy failures

#### UI/UX Improvements
- ✅ **Loading Indicators**: Animated pulse on status during data fetch
- ✅ **Visual Error States**: Pills and banner show distinct error styling
- ✅ **Status Feedback**: Sentiment banner shows "LOADING", "LIVE", or "ERROR"
- ✅ **Accessibility**: Better ARIA labels and keyboard support
- ✅ **Motion Preferences**: Respects `prefers-reduced-motion` settings

### 🛠️ Backend Improvements

#### Configuration Management
- ✅ **Centralized Config**: `backend/config.mjs` centralizes all settings
  - Timeout configurations
  - CORS proxy URLs
  - Correction conditions thresholds
  - Alert channel definitions
  - Message templates

#### Error Handling & Logging
- ✅ **Structured Logging**: JSON-formatted logs with timestamps and levels
- ✅ **Better Error Messages**: Detailed error context for debugging
- ✅ **Graceful Failure Handling**: Try-catch wraps main execution
- ✅ **Error Notifications**: Optional error alerts via configured channels

#### Code Organization
- ✅ **DRY Principle**: Removed duplicated fetch logic
- ✅ **Configurable Timeouts**: All timeouts now centralized
- ✅ **Channel Status Tracking**: Logs which notification channels succeeded/failed

## File Structure

```
├── index.html
├── js/
│   ├── app.js                 (Main orchestrator)
│   ├── data-fetcher.js        (Market data fetching)
│   ├── sentiment-calculator.js (Analysis logic)
│   └── ui-controller.js       (DOM & UI management)
├── backend/
│   ├── check-market.mjs       (GitHub Actions runner - refactored)
│   ├── config.mjs             (NEW - centralized configuration)
│   ├── state.json             (Alert state persistence)
│   └── README.md
└── assets/
    └── (TradingView charts remain unchanged)
```

## How to Use

### Frontend
No changes needed for basic usage. The application:
1. Automatically initializes on page load
2. Shows loading indicators while fetching data
3. Displays error messages if connections fail
4. Auto-refreshes data every 60 seconds

### Backend
Deploy the updated `check-market.mjs` to GitHub Actions:
1. Copy `backend/config.mjs` and `backend/check-market.mjs` to your repo
2. Add credentials to GitHub Secrets as documented in `backend/README.md`
3. The workflow will use centralized configuration from `config.mjs`

## Configuration

### Frontend - App Settings
Edit `js/app.js` to adjust:
- `pollRate`: Data refresh interval (default: 60000ms)
- `timeoutWarning`: Show warning if data takes longer (default: 4000ms)

### Backend - Alert Settings
Edit `backend/config.mjs` to customize:
- `FETCH.TIMEOUT_MS`: Request timeout
- `FETCH.MAX_RETRIES`: Retry attempts  
- `CORRECTION_CONDITIONS`: Thresholds for alerts
- `CHANNELS`: Enable/disable notification methods

## Performance Benefits

- **60% smaller main script**: ~3KB vs ~9KB before refactoring
- **Better caching**: Shared fetch logic reduces redundant code
- **Lazy loading**: Modular structure allows for future code-splitting
- **Improved diagnostics**: Structured logging for easier debugging

## Browser Compatibility

- Chrome 91+
- Firefox 90+
- Safari 15+
- Edge 91+
- Requires ES6 modules support

## Testing

To test the improvements locally:

1. **Loading States**: Open DevTools Network tab, throttle to "Slow 3G"
2. **Error Handling**: Disconnect internet temporarily
3. **UI Changes**: Toggle theme and verify loading animations
4. **Accessibility**: Use keyboard navigation and screen reader

## Future Improvements

Potential enhancements enabled by this refactoring:

- [ ] Real-time WebSocket updates (reduce polling)
- [ ] Service Worker caching for offline support
- [ ] Unit tests for data-fetcher and sentiment-calculator
- [ ] Performance metrics dashboard
- [ ] Multi-language support
- [ ] Mobile app variant
- [ ] Advanced charting library integration

## Changelog

**v2.5 - 2026-09-01**
- Refactored monolithic scripts into ES6 modules
- Added centralized CORS proxy and fetch logic
- Improved error handling and user feedback
- Added loading indicators and timeout warnings
- Centralized backend configuration
- Enhanced structured logging
- Better accessibility support

## Support

For issues or questions:
1. Check browser console for error messages
2. Review GitHub Actions logs for backend errors
3. Enable structured logging in `config.mjs`
4. Submit issues with reproduction steps
