import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";
import "./Legal.css";

function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">⌁</span>
      <span>IndicatorHub</span>
    </Link>
  );
}

interface Props {
  /** Page title, e.g. "Privacy Policy". */
  title: string;
  /** Human-readable last-updated date, e.g. "May 31, 2026". */
  lastUpdated: string;
  /** One-line summary shown under the title. */
  intro: string;
  children: ReactNode;
}

/**
 * Shared chrome for the public legal pages (/terms, /privacy). Reuses the
 * landing page's `.lp` monochrome design system; prose styling lives in
 * Legal.css.
 */
export function LegalLayout({ title, lastUpdated, intro, children }: Props) {
  useEffect(() => {
    document.title = `${title} — IndicatorHub`;
  }, [title]);

  return (
    <div className="lp legal-page">
      <nav className="nav">
        <div className="nav-inner">
          <Logo />
          <div aria-hidden />
          <div className="nav-cta">
            <Link to="/" className="btn-signin">
              Back to home <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="legal-wrap">
        <header className="legal-head">
          <span className="legal-eyebrow">LEGAL</span>
          <h1>{title}</h1>
          <p className="legal-updated">Last updated: {lastUpdated}</p>
          <p className="legal-intro">{intro}</p>
        </header>

        <article className="legal-prose">{children}</article>

        <div className="legal-cross">
          <Link to="/privacy">Privacy Policy</Link>
          <span aria-hidden>·</span>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </main>

      <footer>
        <div className="container">
          <div className="footer-base">
            <span>© 2026 indicatorhub.dev · not investment advice</span>
            <span>
              <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
