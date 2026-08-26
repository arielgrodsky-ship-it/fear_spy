import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, BarChart3, Bell, ChevronDown, LayoutGrid, Moon, Search, Sun, Zap } from 'lucide-react';
import './styles.css';
import { demoSnapshot, loadMarketSnapshot } from './data/market.js';

const cards = [
  { symbol: 'XLP / SPY', title: 'Consumer Staples / S&P 500', tv: 'AMEX:XLP/AMEX:SPY', tone: 'negative', size: 'wide', description: 'Defensive rotation proxy.' },
  { symbol: 'XLU', title: 'Utilities Select Sector SPDR', tv: 'AMEX:XLU', tone: 'caution', size: 'wide', description: 'Safe-haven demand.' },
  { symbol: 'VIX', title: 'CBOE Volatility Index', tv: 'TVC:VIX', tone: 'negative', size: 'standard', description: 'Implied fear gauge.' },
  { symbol: 'XLY / XLP', title: 'Discretionary / Staples', tv: 'AMEX:XLY/AMEX:XLP', tone: 'positive', size: 'standard', description: 'Risk appetite signal.' },
  { symbol: 'RSP', title: 'S&P 500 Equal Weight ETF', tv: 'AMEX:RSP', tone: 'positive', size: 'standard', description: 'Participation breadth.' },
  { symbol: 'S5TH', title: 'Stocks above 200-day MA', tv: 'S5TH', tone: 'neutral', size: 'standard', description: 'Long-term breadth health.' },
  { symbol: 'S5FI', title: 'Stocks above 50-day MA', tv: 'S5FI', tone: 'neutral', size: 'standard', description: 'Near-term momentum pulse.' },
];

function App() {
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(demoSnapshot);
  const [activeNav, setActiveNav] = useState('Overview');

  useEffect(() => {
    const controller = new AbortController();
    loadMarketSnapshot(controller.signal).then(nextSnapshot => {
      setSnapshot(nextSnapshot);
      setLoading(false);
    });
    return () => controller.abort();
  }, []);

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <Navigation dark={dark} setDark={setDark} activeNav={activeNav} setActiveNav={setActiveNav} />
      <TickerTape />
      <main className="shell">
        <section className="intro">
          <div>
            <p className="kicker"><span className="kicker-line" /> US equities / internal pulse</p>
            <h1>See the market<br /><em>underneath</em> the market.</h1>
            <p className="intro-copy">A focused read on participation, rotation, and risk appetite before the headline index tells the whole story.</p>
          </div>
          <div className="session-card">
            <span className="live-dot" />
            <div><strong>New York session</strong><small>Data refreshed 09:42:18 ET</small></div>
            <ChevronDown size={16} />
          </div>
        </section>

        <SentimentBanner loading={loading} snapshot={snapshot} />

        <div className="section-heading">
          <div><span className="section-index">01</span><h2>Market pulse</h2></div>
          <button className="quiet-button"><LayoutGrid size={15} /> Configure view</button>
        </div>
        <BentoGrid loading={loading} snapshot={snapshot} />
      </main>
      <footer><span><strong>BreadthView</strong> / Decision support for curious investors</span><span>Data is delayed · Not investment advice</span></footer>
    </div>
  );
}

function Navigation({ dark, setDark, activeNav, setActiveNav }) {
  return <nav className="nav">
    <a className="brand" href="#top"><span className="brand-mark"><BarChart3 size={18} /></span><span><strong>BreadthView</strong><small>Market intelligence</small></span></a>
    <div className="nav-links">{['Overview', 'Rotation', 'Breadth', 'Volatility'].map(item => <button key={item} className={activeNav === item ? 'active' : ''} onClick={() => setActiveNav(item)}>{item}</button>)}</div>
    <div className="nav-actions"><button className="icon-button" aria-label="Search"><Search size={17} /></button><button className="icon-button" aria-label="Notifications"><Bell size={17} /></button><button className="theme-button" onClick={() => setDark(value => !value)} aria-label="Toggle theme">{dark ? <Sun size={15} /> : <Moon size={15} />}</button><span className="live-label"><span className="live-dot" /> LIVE</span></div>
  </nav>;
}

function TickerTape() {
  return <div className="ticker"><div className="ticker-track">{['SPY  +0.38%', 'QQQ  +0.71%', 'IWM  -0.22%', 'DXY  +0.14%', 'TLT  -0.46%', 'VIX  16.8', '10Y  4.24%'].map(item => <span key={item}>{item}</span>)}</div><span className="ticker-time">MARKET OPEN · 09:42 ET</span></div>;
}

function SentimentBanner({ loading, snapshot }) {
  return <section className="sentiment">
    <div className="sentiment-main"><div className="eyebrow"><Zap size={14} /> Composite read <span className="status-chip">Elevated caution</span></div>{loading ? <><div className="skeleton headline-skeleton" /><div className="skeleton text-skeleton" /></> : <><h2>{snapshot.verdict}</h2><p>{snapshot.summary}</p></>}</div>
    <div className="score"><span>Sentiment score</span><strong>{loading ? '--' : snapshot.score}</strong><small>/ 100</small><div className="score-bar"><i style={{ width: loading ? '12%' : `${snapshot.score}%` }} /></div><b>CAUTION ZONE</b></div>
    <div className="signal-list">{snapshot.signals.map(signal => <div className="signal" key={signal.symbol}><div><strong>{signal.symbol}</strong><small>{signal.name}</small></div>{loading ? <span className="skeleton pill-skeleton" /> : <span className={`signal-value ${signal.tone}`}>{signal.value}</span>}<small className="signal-note">{signal.note}</small></div>)}</div>
  </section>;
}

function BentoGrid({ loading, snapshot }) {
  return <div className="bento">{cards.map(card => { const value = snapshot.signals.find(item => item.symbol === card.symbol)?.value ?? 'N/A'; return <article className={`widget-card ${card.size} ${card.tone}`} key={card.symbol}><div className="card-head"><div><span className="card-symbol">{card.symbol}</span><h3>{card.title}</h3></div><button className="card-menu" aria-label={`Open ${card.symbol} details`}><ArrowUpRight size={17} /></button></div><div className="card-metric">{loading ? <span className="skeleton metric-skeleton" /> : <><strong>{value}</strong><span className={card.tone}>1D</span></>}</div><TradingViewChart symbol={card.tv} /><div className="card-foot"><span>{card.description}</span><span className="chart-label">1D <ChevronDown size={13} /></span></div></article>; })}</div>;
}

function TradingViewChart({ symbol }) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '300px' });
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !hostRef.current || hostRef.current.dataset.loaded) return;
    hostRef.current.dataset.loaded = 'true';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({ autosize: true, symbol, interval: 'D', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en', backgroundColor: 'rgba(18,27,32,1)', gridColor: 'rgba(255,255,255,0.04)', hide_top_toolbar: false, hide_legend: false, save_image: false, calendar: false, hide_volume: true, support_host: 'https://www.tradingview.com' });
    hostRef.current.append(widget, script);
  }, [symbol, visible]);
  return <div className="chart tradingview-widget-container" ref={hostRef} aria-label={`${symbol} TradingView chart`}><span className="chart-loading">{visible ? 'Loading chart...' : 'Chart loads on view'}</span></div>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
