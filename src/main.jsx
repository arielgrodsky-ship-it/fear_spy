import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, BarChart3, Bell, ChevronDown, LayoutGrid, Moon, Search, Sun, Zap } from 'lucide-react';
import './styles.css';
import { demoSnapshot, loadMarketSnapshot } from './data/market.js';

const cards = [
  { symbol: 'S5FI', title: '% above 50-day average', value: '46.2%', change: '-3.8 pts', tone: 'neutral', size: 'feature', description: 'Participation is thinning beneath the index.' },
  { symbol: 'XLP / SPY', title: 'Defensive rotation', value: '+0.42%', change: 'today', tone: 'caution', size: 'standard', description: 'Staples are quietly outperforming beta.' },
  { symbol: 'XLY / XLP', title: 'Risk appetite', value: '-0.28%', change: 'today', tone: 'negative', size: 'standard', description: 'Discretionary leadership is losing altitude.' },
  { symbol: 'RSP', title: 'Equal-weight participation', value: '-0.14%', change: 'today', tone: 'negative', size: 'wide', description: 'A softer read than capitalization-weighted SPY.' },
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
        <BentoGrid loading={loading} />
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

function BentoGrid({ loading }) {
  return <div className="bento">{cards.map(card => <article className={`widget-card ${card.size} ${card.tone}`} key={card.symbol}><div className="card-head"><div><span className="card-symbol">{card.symbol}</span><h3>{card.title}</h3></div><button className="card-menu" aria-label={`Open ${card.symbol} details`}><ArrowUpRight size={17} /></button></div><div className="card-metric">{loading ? <span className="skeleton metric-skeleton" /> : <><strong>{card.value}</strong><span className={card.tone}>{card.change}</span></>}</div><div className="chart" aria-label={`${card.symbol} chart placeholder`}><ChartShape tone={card.tone} /></div><div className="card-foot"><span>{card.description}</span><span className="chart-label">1D <ChevronDown size={13} /></span></div></article>)}</div>;
}

function ChartShape({ tone }) {
  const color = tone === 'negative' ? '#cc5e50' : tone === 'caution' ? '#c38a35' : tone === 'positive' ? '#087a52' : '#367f99';
  return <svg viewBox="0 0 520 140" preserveAspectRatio="none" role="img"><path d="M0 115 C45 98, 58 112, 92 92 S145 110, 180 78 S225 84, 255 69 S300 80, 330 42 S365 64, 402 37 S455 60, 520 20" fill="none" stroke={color} strokeWidth="2.5" /><path d="M0 115 C45 98, 58 112, 92 92 S145 110, 180 78 S225 84, 255 69 S300 80, 330 42 S365 64, 402 37 S455 60, 520 20 V140 H0Z" fill={color} opacity=".08" /></svg>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
