import { useState } from "react";
import { Gauge } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-10 flex flex-col items-center text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <span
          className="w-12 h-12 flex items-center justify-center rounded-lg mb-6"
          style={{
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border-strong)",
          }}
          aria-hidden
        >
          <Gauge
            size={22}
            strokeWidth={1.75}
            style={{ color: "var(--accent)" }}
          />
        </span>

        <h1
          className="text-xl tracking-tight"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          Should I Buy Now?
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Stock indicator dashboard
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="mt-8 w-full h-11 rounded-md text-sm tracking-tight transition-colors disabled:opacity-60"
          style={{
            backgroundColor: "var(--accent)",
            color: "#1a1a1a",
            fontWeight: 500,
          }}
        >
          {submitting ? "Redirecting…" : "Continue with Google"}
        </button>

        {devBypassAvailable ? (
          <button
            type="button"
            onClick={signInAsDevUser}
            className="mt-3 w-full h-10 rounded-md text-xs tracking-tight transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              border: "1px dashed var(--border-strong)",
            }}
            data-testid="login-dev-bypass"
          >
            Use dev account
          </button>
        ) : null}

        {err ? (
          <p
            className="mt-4 text-xs"
            style={{ color: "var(--negative)" }}
            role="alert"
          >
            {err}
          </p>
        ) : null}

        <p
          className="mt-8 text-[11px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          Sign-in is required to view dashboards, watchlists, and indicator
          settings.
        </p>
      </div>
    </div>
  );
}
