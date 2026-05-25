import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Landing.css";

type Indicator = {
  id: string;
  name: string;
  desc: string;
  cond: string;
};

type UniverseEntry = {
  price: number;
  chg: number;
  fired: string[];
};

// A representative subset of the 83 indicators in the system — used by the
// interactive Alert Builder demo. The full set is shown in the catalog below.
const INDICATORS: Indicator[] = [
  { id: "rsi_oversold", name: "RSI Oversold", desc: "RSI(14) below 30 — classic oversold bounce", cond: "RSI(14) < 30" },
  { id: "macd_bullish_cross", name: "MACD Bullish Cross", desc: "MACD line crossed above its signal in last 3d", cond: "MACD(12,26,9) crosses_above signal" },
  { id: "above_sma_50", name: "Above 50 SMA", desc: "Close above the 50-day simple moving average", cond: "close > SMA(50)" },
  { id: "golden_cross", name: "Golden Cross", desc: "SMA-50 above SMA-200 — bullish regime", cond: "SMA(50) > SMA(200)" },
  { id: "bb_lower_touch", name: "Lower Bollinger Touch", desc: "Close at or below BB lower (20, 2σ)", cond: "close <= BB(20,2).lower" },
  { id: "volume_spike", name: "Volume Spike (1.5×)", desc: "Volume > 1.5× the 20-day average", cond: "volume > 1.5 * avg(volume,20)" },
  { id: "adx_strong_trend", name: "ADX Strong Trend", desc: "ADX(14) above 25 — strong directional move", cond: "ADX(14) > 25" },
];

const UNIVERSE: Record<string, UniverseEntry> = {
  NVDA: { price: 948.2, chg: 2.1, fired: ["rsi_oversold", "above_sma_50", "adx_strong_trend"] },
  META: { price: 612.4, chg: 1.4, fired: ["macd_bullish_cross", "volume_spike"] },
  TSLA: { price: 214.85, chg: -0.6, fired: ["bb_lower_touch"] },
  AMD: { price: 172.1, chg: 0.8, fired: ["golden_cross", "adx_strong_trend", "above_sma_50"] },
  AAPL: { price: 222.4, chg: 0.3, fired: ["adx_strong_trend"] },
  MSFT: { price: 438.1, chg: 0.5, fired: ["macd_bullish_cross"] },
  GOOG: { price: 174.6, chg: 1.1, fired: ["volume_spike", "adx_strong_trend"] },
  AMZN: { price: 198.3, chg: 0.6, fired: ["above_sma_50"] },
  NFLX: { price: 678.5, chg: -1.2, fired: ["bb_lower_touch", "rsi_oversold"] },
};

// Indicator catalog — grouped families (one row per indicator family rather
// than one per threshold). Backend has many variants per family; see
// server/src/indicator-registry.ts for the full list.
const CATALOG: Array<{ abbr: string; name: string; cat: string }> = [
  // Momentum
  { abbr: "RSI", name: "Relative Strength Index", cat: "Momentum" },
  { abbr: "MACD", name: "Moving Avg Convergence/Divergence", cat: "Momentum" },
  { abbr: "STOCH", name: "Stochastic Oscillator", cat: "Momentum" },
  { abbr: "CCI", name: "Commodity Channel Index", cat: "Momentum" },

  // Trend
  { abbr: "SMA", name: "Simple Moving Averages", cat: "Trend" },
  { abbr: "EMA", name: "Exponential Moving Averages", cat: "Trend" },
  { abbr: "ADX", name: "Avg Directional Index", cat: "Trend" },
  { abbr: "PSAR", name: "Parabolic SAR", cat: "Trend" },

  // Volatility
  { abbr: "BB", name: "Bollinger Bands", cat: "Volatility" },
  { abbr: "KC", name: "Keltner Channels", cat: "Volatility" },
  { abbr: "ATR", name: "Average True Range", cat: "Volatility" },

  // Volume
  { abbr: "VOL", name: "Volume Spikes", cat: "Volume" },
  { abbr: "OBV", name: "On-Balance Volume", cat: "Volume" },
  { abbr: "CMF", name: "Chaikin Money Flow", cat: "Volume" },

  // Pattern + range
  { abbr: "CDLE", name: "Candlestick Patterns", cat: "Pattern" },
  { abbr: "52W", name: "52-Week Range", cat: "Mean Reversion" },
];

function highlightCond(cond: string): string {
  return cond
    .split(/\s+/)
    .map((p) => {
      if (/^[A-Z]/.test(p) && p.includes("(")) return `<span class="k">${p}</span>`;
      if (/^(crosses_above|crosses_below|>|<|>=|<=)$/.test(p)) return `<span class="k">${p}</span>`;
      if (/^-?[\d.]+$/.test(p)) return `<span class="n">${p}</span>`;
      return p;
    })
    .join(" ");
}

function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">⌁</span>
      <span>IndicatorHub</span>
    </Link>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [watchlist, setWatchlist] = useState<string[]>([
    "NVDA",
    "META",
    "TSLA",
    "AMD",
    "AAPL",
    "MSFT",
  ]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["rsi_oversold", "above_sma_50"]),
  );
  const [tickerInput, setTickerInput] = useState("");

  useEffect(() => {
    document.title = "IndicatorHub — Pre-market signals for stocks worth watching";
  }, []);

  function goToApp() {
    navigate(user ? "/dashboard" : "/login");
  }

  function toggleIndicator(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeTicker(t: string) {
    setWatchlist((prev) => prev.filter((x) => x !== t));
  }

  function handleTickerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const t = tickerInput.trim().toUpperCase();
      if (t && !watchlist.includes(t)) {
        setWatchlist((prev) => [...prev, t]);
      }
      setTickerInput("");
    }
  }

  const selectedArr = useMemo(
    () => INDICATORS.filter((i) => selected.has(i.id)),
    [selected],
  );

  const previewCodeHtml = useMemo(() => {
    let code = "";
    code += `<span class="c">// alert: my_morning_setup</span>\n`;
    code += `<span class="k">watchlist</span> = [${watchlist
      .map((t) => `<span class="s">"${t}"</span>`)
      .join(", ")}]\n\n`;
    if (selectedArr.length === 0) {
      code += `<span class="k">when</span> <span class="c">/* pick conditions on the left */</span>\n`;
    } else {
      code += `<span class="k">when</span> (\n`;
      selectedArr.forEach((s, i) => {
        const pretty = highlightCond(s.cond);
        code += `  <span class="ind">${pretty}</span>${
          i < selectedArr.length - 1 ? '\n  <span class="k">and</span>' : ""
        }\n`;
      });
      code += `)\n`;
    }
    code += `\n<span class="k">deliver</span> <span class="s">"email"</span> <span class="k">at</span> <span class="s">"06:30 ET"</span>`;
    return code;
  }, [watchlist, selectedArr]);

  const matches = useMemo(() => {
    if (selectedArr.length === 0) return [];
    return watchlist
      .map((t) => {
        const u = UNIVERSE[t];
        if (!u) return null;
        const hits = [...selected].filter((id) => u.fired.includes(id));
        if (hits.length === 0) return null;
        return { t, u, hits };
      })
      .filter((m): m is { t: string; u: UniverseEntry; hits: string[] } => m !== null)
      .sort((a, b) => b.hits.length - a.hits.length);
  }, [selectedArr, watchlist, selected]);

  return (
    <div className="lp">
      <nav className="nav">
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <a href="#indicators">Indicators</a>
            <a href="#digest">Digest</a>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="btn-signin">
              Sign in <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="bg-grid" />
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="eyebrow">
                <span className="pulse" />
                PRE-MARKET DIGEST · 06:30 ET DAILY
              </span>
              <h1>
                Know which stocks <em>deserve</em> your attention. Before the bell.
              </h1>
              <p className="lead">
                IndicatorHub watches your tickers against the technical conditions you care about — and emails you a short, ranked digest every morning. Set it once. Stop watching charts.
              </p>
              <div className="hero-cta">
                <button type="button" className="btn btn-primary" onClick={goToApp}>
                  Build your first alert →
                </button>
                <a href="#digest" className="btn btn-outline">
                  See a sample digest
                </a>
              </div>
              <div className="hero-meta">
                <b>No credit card.</b>&nbsp;&nbsp;Free for 50 tickers · Unlimited indicators
              </div>
            </div>

            <div className="email-card">
              <div className="email-head">
                <span className="dot r" />
                <span className="dot y" />
                <span className="dot g" />
                <span className="from">digest@indicatorhub.dev</span>
              </div>
              <div className="email-subj">
                <span className="label">subject:</span> 4 tickers matched your conditions — Tue, May 19
              </div>
              <div className="email-time">delivered 06:31 ET · open before the bell</div>
              <div className="email-body">
                <div className="digest-title">SIGNAL DIGEST · WATCHLIST 7</div>

                <div className="digest-row">
                  <div>
                    <div className="ticker">NVDA</div>
                    <div className="ticker-price">$948.20</div>
                  </div>
                  <div className="conditions">
                    <span className="met">✓</span> RSI(14) crossed 30 from below
                    <br />
                    <span className="met">✓</span> Price &gt; SMA(50)
                  </div>
                  <div className="pct">+2.1%</div>
                </div>

                <div className="digest-row">
                  <div>
                    <div className="ticker">META</div>
                    <div className="ticker-price">$612.40</div>
                  </div>
                  <div className="conditions">
                    <span className="met">✓</span> MACD bullish cross
                    <br />
                    <span className="met">✓</span> Volume &gt; 1.5× avg(20)
                  </div>
                  <div className="pct">+1.4%</div>
                </div>

                <div className="digest-row">
                  <div>
                    <div className="ticker">TSLA</div>
                    <div className="ticker-price">$214.85</div>
                  </div>
                  <div className="conditions">
                    <span className="met">✓</span> Bollinger lower band touch
                    <br />
                    <span className="met">✓</span> RSI(14) &lt; 35
                  </div>
                  <div className="pct down">−0.6%</div>
                </div>

                <div className="digest-row">
                  <div>
                    <div className="ticker">AMD</div>
                    <div className="ticker-price">$172.10</div>
                  </div>
                  <div className="conditions">
                    <span className="met">✓</span> Golden cross (SMA50 &gt; SMA200)
                    <br />
                    <span className="met">✓</span> ADX(14) &gt; 25
                  </div>
                  <div className="pct">+0.8%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ALERT BUILDER ============ */}
      <section id="builder" className="builder">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">ALERT BUILDER</span>
            <h2>
              Compose alerts the way you actually <em>trade</em>.
            </h2>
            <p className="section-sub">
              Combine any indicators. Use AND/OR logic. IndicatorHub evaluates the full expression against each ticker on your watchlist, every market close. Try it below — pick conditions and watch the matches update in real time against last night's data.
            </p>
          </div>

          <div className="builder-shell">
            <div className="builder-left">
              <div className="builder-label">// Watchlist</div>
              <div className="watchlist-input">
                {watchlist.map((t) => (
                  <span key={t} className="chip">
                    {t}{" "}
                    <span className="x" onClick={() => removeTicker(t)}>
                      ×
                    </span>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="add ticker..."
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value)}
                  onKeyDown={handleTickerKeyDown}
                />
              </div>

              <div className="builder-label">// Conditions</div>
              <div className="indicators-list">
                {INDICATORS.map((ind) => (
                  <div
                    key={ind.id}
                    className={`indicator${selected.has(ind.id) ? " active" : ""}`}
                    onClick={() => toggleIndicator(ind.id)}
                  >
                    <div className="indicator-check" />
                    <div className="indicator-body">
                      <div className="indicator-name">{ind.name}</div>
                      <div className="indicator-desc">{ind.desc}</div>
                    </div>
                    <div className="indicator-cond">{ind.cond.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="builder-right">
              <div className="preview-head">
                <div className="builder-label">// Alert preview</div>
                <div className="preview-status">
                  <span className="pulse-mini" />
                  EVALUATING
                </div>
              </div>

              <div
                className="preview-code"
                dangerouslySetInnerHTML={{ __html: previewCodeHtml }}
              />

              <div className="match-card">
                <div className="mh">
                  MATCHES TONIGHT · {matches.length} OF {watchlist.length}
                </div>
                <div className="match-list">
                  {selectedArr.length === 0 ? (
                    <div className="match-empty">
                      No conditions selected yet — pick one or more on the left.
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="match-empty">
                      No watchlist tickers match these conditions on last night's data.
                    </div>
                  ) : (
                    matches.map((m) => {
                      const reason = m.hits
                        .map((h) =>
                          INDICATORS.find((i) => i.id === h)!.name.toLowerCase(),
                        )
                        .join(" · ");
                      return (
                        <div key={m.t} className="match-row">
                          <div>
                            <span className="t">{m.t}</span>{" "}
                            <span className="why">→ {reason}</span>
                          </div>
                          <div>${m.u.price.toFixed(2)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="steps">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">HOW IT WORKS</span>
            <h2>
              Three steps. Then you can <em>stop</em> watching.
            </h2>
          </div>

          <div className="step-grid">
            <div className="step">
              <div className="step-num">01 / SETUP</div>
              <h3>Add your watchlist</h3>
              <p>
                Paste your tickers — up to 50 on the free tier, unlimited on Pro. ETFs, stocks, ADRs. Anything with an EOD price.
              </p>
              <div className="step-visual">
                <div className="row"><span>watchlist</span><span className="v">7 tickers</span></div>
                <div className="row"><span>universe</span><span className="v">US equities</span></div>
                <div className="row"><span>timeframe</span><span className="v">daily</span></div>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02 / DEFINE</div>
              <h3>Compose your conditions</h3>
              <p>
                Mix and match technical indicators with AND / OR logic. RSI crosses, MACD signals, moving-average breaches, volume spikes — your strategy, your rules.
              </p>
              <div className="step-visual">
                <div className="row"><span>indicators</span><span className="v">full library</span></div>
                <div className="row"><span>logic</span><span className="v">AND / OR / NOT</span></div>
                <div className="row"><span>alerts/account</span><span className="v">unlimited</span></div>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03 / RECEIVE</div>
              <h3>Get the morning digest</h3>
              <p>
                Every weekday at 06:30 ET, a clean, ranked email arrives. Only the tickers that matched. Only the conditions that fired. Nothing else.
              </p>
              <div className="step-visual">
                <div className="row"><span>delivery</span><span className="v">06:30 ET</span></div>
                <div className="row"><span>format</span><span className="v">email + web</span></div>
                <div className="row"><span>quiet days</span><span className="v">skipped</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ INDICATORS CATALOG ============ */}
      <section id="indicators" className="catalog">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">INDICATOR LIBRARY</span>
            <h2>
              The full toolkit. <em>Every</em> classical signal traders actually track.
            </h2>
            <p className="section-sub">
              Momentum, trend, volatility, volume, candlestick patterns, mean-reversion — each family ships with the variants and thresholds you'd expect. All evaluated at end-of-day on standard OHLCV from major US exchanges.
            </p>
          </div>

          <div className="cat-grid">
            {CATALOG.map((c) => (
              <div key={c.abbr} className="cat-cell">
                <div className="cat-abbr">{c.abbr}</div>
                <div className="cat-name">{c.name}</div>
                <div className="cat-cat">{c.cat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SAMPLE DIGEST ============ */}
      <section id="digest" className="digest-section">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">THE MORNING DIGEST</span>
            <h2>
              One email. Only the tickers <em>worth</em> opening.
            </h2>
          </div>

          <div className="digest-shell">
            <div className="digest-copy">
              <h3>Built to be skimmed in 60 seconds.</h3>
              <p>
                The digest leads with the strongest matches, shows the exact conditions that fired, and links straight to the chart. If nothing matched, the email is one line — no padding, no filler.
              </p>

              <div className="feature-list">
                <div className="feature-item">
                  <span className="dot-mark" />
                  <div>
                    <b>Ranked by signal strength.</b> Multi-condition matches and stronger cross magnitudes rise to the top.
                  </div>
                </div>
                <div className="feature-item">
                  <span className="dot-mark" />
                  <div>
                    <b>Plain-language reasons.</b> Each match says exactly which of your conditions fired and the values that crossed.
                  </div>
                </div>
                <div className="feature-item">
                  <span className="dot-mark" />
                  <div>
                    <b>Quiet on quiet days.</b> If your watchlist had no matches, the digest is one line. No noise.
                  </div>
                </div>
                <div className="feature-item">
                  <span className="dot-mark" />
                  <div>
                    <b>Web-mirrored.</b> Every digest is also archived in your dashboard, fully searchable.
                  </div>
                </div>
              </div>
            </div>

            <div className="digest-mock">
              <div className="digest-head">
                <div className="when">tue · may 19 · 06:31 et</div>
                <div className="title">4 tickers matched your conditions overnight</div>
              </div>
              <div className="digest-summary">
                <div>
                  <span className="num up">4</span> matched
                </div>
                <div>
                  <span className="num">6</span> watched
                </div>
                <div>
                  <span className="num">2</span> conditions
                </div>
                <div>
                  <span className="num">12d</span> streak
                </div>
              </div>

              <div className="digest-section-h">Strong matches</div>

              <div className="digest-item">
                <div>
                  <div className="tk">NVDA</div>
                  <div className="tk-sub">NVIDIA Corp</div>
                </div>
                <div className="reason">
                  <span className="hl">RSI(14)</span> crossed 30 from below at{" "}
                  <span className="hl">31.8</span>
                  <br />
                  <span className="hl">Close</span> reclaimed{" "}
                  <span className="hl">SMA(50)</span> at $926.40
                </div>
                <div className="stat">
                  <div className="price">$948.20</div>
                  <div className="chg">+2.1% AH</div>
                </div>
              </div>

              <div className="digest-item">
                <div>
                  <div className="tk">META</div>
                  <div className="tk-sub">Meta Platforms</div>
                </div>
                <div className="reason">
                  <span className="hl">MACD(12,26,9)</span> bullish cross
                  <br />
                  Volume <span className="hl">1.8×</span> the 20d average
                </div>
                <div className="stat">
                  <div className="price">$612.40</div>
                  <div className="chg">+1.4% AH</div>
                </div>
              </div>

              <div className="digest-section-h">Mean-reversion setups</div>

              <div className="digest-item">
                <div>
                  <div className="tk">TSLA</div>
                  <div className="tk-sub">Tesla Inc</div>
                </div>
                <div className="reason">
                  Touched <span className="hl">lower Bollinger band</span> (20, 2σ)
                  <br />
                  <span className="hl">RSI(14)</span> at 32.1, below your 35 threshold
                </div>
                <div className="stat">
                  <div className="price">$214.85</div>
                  <div className="chg down">−0.6% AH</div>
                </div>
              </div>

              <div className="digest-item">
                <div>
                  <div className="tk">AMD</div>
                  <div className="tk-sub">Adv. Micro Devices</div>
                </div>
                <div className="reason">
                  <span className="hl">SMA(50)</span> crossed above{" "}
                  <span className="hl">SMA(200)</span> — golden cross
                  <br />
                  <span className="hl">ADX(14)</span> at 27.4, trend strengthening
                </div>
                <div className="stat">
                  <div className="price">$172.10</div>
                  <div className="chg">+0.8% AH</div>
                </div>
              </div>

              <div className="digest-foot">
                <span>digest #186 · alert v3</span>
                <span>indicatorhub.dev/d/0186</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING (hidden — keep code for later) ============ */}
      {/*
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">PRICING</span>
            <h2>
              Free for the first 50 tickers. <em>Forever.</em>
            </h2>
          </div>

          <div className="price-grid">
            <div className="price-card">
              <div className="price-tier">Free</div>
              <div className="price-amt">
                $0<span className="per"> / forever</span>
              </div>
              <div className="price-desc">Enough horsepower for most active traders.</div>
              <ul className="price-feats">
                <li>Up to 50 tickers</li>
                <li>Up to 3 alert rules</li>
                <li>Daily pre-market digest</li>
                <li>All 83 indicators</li>
                <li>30-day digest history</li>
              </ul>
              <button type="button" className="btn btn-outline" onClick={goToApp}>
                Start free
              </button>
            </div>

            <div className="price-card featured">
              <div className="price-tier">Pro</div>
              <div className="price-amt">
                $12<span className="per"> / month</span>
              </div>
              <div className="price-desc">For strategy-builders running real rules at scale.</div>
              <ul className="price-feats">
                <li>Unlimited tickers</li>
                <li>Unlimited alert rules</li>
                <li>Intraday alerts (15-min bars)</li>
                <li>Custom expression language</li>
                <li>5-year digest history + CSV export</li>
                <li>Email + SMS + webhook delivery</li>
              </ul>
              <button type="button" className="btn btn-primary" onClick={goToApp}>
                Start 14-day trial
              </button>
            </div>

            <div className="price-card">
              <div className="price-tier">Desk</div>
              <div className="price-amt">
                $49<span className="per"> / month</span>
              </div>
              <div className="price-desc">Small teams sharing a watchlist and a strategy.</div>
              <ul className="price-feats">
                <li>Everything in Pro</li>
                <li>5 seats included</li>
                <li>Shared watchlists &amp; rules</li>
                <li>1-minute intraday bars</li>
                <li>API access</li>
                <li>Priority support</li>
              </ul>
              <a href="#" className="btn btn-outline">
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* ============ CTA ============ */}
      <section className="cta-section">
        <div className="container">
          <span className="section-tag">START</span>
          <h2 style={{ margin: "12px auto 0" }}>
            Set your alerts once. Walk into <em>every</em> trading day knowing what's lining up.
          </h2>
          <p className="lead">
            No credit card. No charts to babysit. Just the tickers worth opening, in your inbox at 6:30.
          </p>
          <div className="cta-buttons">
            <button type="button" className="btn btn-primary" onClick={goToApp}>
              Build your first alert
            </button>
            <a href="#how" className="btn btn-outline">
              Read the docs
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <Logo />
              <p>A personal stock-alert system. Built by traders who got tired of watching charts.</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <a href="/dashboard">Dashboard</a>
              <a href="#digest">Newsletter</a>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Terms</a>
            </div>
          </div>
          <div className="footer-base">
            <span>© 2026 indicatorhub.dev · not investment advice</span>
            <span>v3.2.1 · status: operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
