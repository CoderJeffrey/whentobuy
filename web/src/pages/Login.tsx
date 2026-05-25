import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Login.css";

export default function Login() {
  const { signInWithGoogle, signInAsDevUser, devBypassAvailable } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleGoogle() {
    setErr(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="lpg">
      <div className="bg-grid" />
      <div className="rail l" />
      <div className="rail r" />

      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">⌁</span>
            <span>IndicatorHub</span>
          </Link>
          <div />
          <Link to="/" className="nav-back">
            <span className="arrow">←</span> <span>Back to home</span>
          </Link>
        </div>
      </nav>

      <div className="shell">
        <div>
          <div className="auth-card">
            <span className="auth-eyebrow">
              <span className="pulse" />
              SIGN IN · INDICATORHUB
            </span>

            <h1 className="auth-title">
              Welcome <em>back</em>.
            </h1>
            <p className="auth-sub">
              Sign in to access your dashboards, watchlists, and indicator
              settings.
            </p>

            <div className="auth-tag">
              CONTINUE WITH <span className="line" />
            </div>

            <button
              className="oauth-btn"
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              {submitting ? "Redirecting…" : "Continue with Google"}
            </button>

            {devBypassAvailable ? (
              <>
                <div className="or-divider">or</div>
                <button
                  className="oauth-btn ghost"
                  type="button"
                  onClick={signInAsDevUser}
                  data-testid="login-dev-bypass"
                >
                  Use dev account
                </button>
              </>
            ) : null}

            {err ? (
              <p className="auth-error" role="alert">
                {err}
              </p>
            ) : null}

            <div className="auth-foot">
              By continuing you agree to our <a href="#">Terms</a> and{" "}
              <a href="#">Privacy</a>.
            </div>
          </div>

          <div className="trust">
            <span>
              <span className="dot" />
              SOC 2 · type II
            </span>
            <span>
              <span className="dot" />
              END-TO-END TLS
            </span>
            <span>
              <span className="dot" />
              NO BROKER LINK
            </span>
          </div>
        </div>
      </div>

      <div className="legal">
        © 2026 indicatorhub.dev · not investment advice · v3.2.1
      </div>
    </div>
  );
}
