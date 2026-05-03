import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { unsubscribeWithToken } from "../lib/api";

type Status = "loading" | "success" | "missing" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "missing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    unsubscribeWithToken(token)
      .then(() => {
        if (active) setStatus("success");
      })
      .catch((err) => {
        if (!active) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <section
        className="rounded-2xl p-10 max-w-md w-full text-center flex flex-col items-center gap-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--bg-card-raised)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <Mail size={22} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
        </div>

        {status === "loading" && (
          <>
            <h1
              className="text-lg"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              Unsubscribing…
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              One moment please.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1
              className="text-lg"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              You've been unsubscribed
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              You will no longer receive daily watchlist emails.
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Was this a mistake?{" "}
              <Link
                to="/settings"
                style={{
                  color: "var(--accent)",
                  textDecoration: "underline",
                }}
              >
                Sign in to resubscribe
              </Link>
            </p>
          </>
        )}

        {status === "missing" && (
          <>
            <h1
              className="text-lg"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              Missing token
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              This unsubscribe link is invalid. Use the link from a recent email.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1
              className="text-lg"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              We couldn't unsubscribe you
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {errorMessage ??
                "Please try again, or open Settings to turn off emails."}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
