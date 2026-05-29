import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { searchSecurities } from "../lib/api";
import { formatSymbol, marketBadge } from "../lib/symbol";
import type { Security } from "../types";

export function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q]);

  const searchQ = useQuery({
    queryKey: ["search", debounced],
    queryFn: ({ signal }) => searchSecurities(debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 60_000,
  });

  const results: Security[] = debounced ? (searchQ.data ?? []) : [];
  const safeIdx =
    results.length > 0 ? Math.min(activeIdx, results.length - 1) : 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(sec: Security) {
    setOpen(false);
    setQ("");
    setDebounced("");
    navigate(`/dashboard/${formatSymbol(sec.ticker, sec.exchange)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sec = results[safeIdx];
      if (sec) pick(sec);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`search${focused ? " focused" : ""}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder="Search stocks, indicators, combos…"
        data-testid="search-input"
        aria-label="Search stocks"
        autoComplete="off"
        spellCheck={false}
      />
      {q ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setDebounced("");
            setOpen(false);
          }}
          aria-label="Clear search"
          className="kbd"
          style={{ cursor: "pointer" }}
          data-testid="search-clear"
        >
          ✕
        </button>
      ) : (
        <span className="kbd">⌘ K</span>
      )}

      {open && debounced && (
        <div className="search-dropdown" data-testid="search-dropdown">
          {searchQ.isFetching && results.length === 0 && (
            <div className="search-empty">Searching…</div>
          )}
          {!searchQ.isFetching && results.length === 0 && (
            <div className="search-empty" data-testid="search-empty">
              No matches.
            </div>
          )}
          {results.map((sec, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={formatSymbol(sec.ticker, sec.exchange)}
                type="button"
                onClick={() => pick(sec)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`search-result${active ? " active" : ""}`}
                data-testid="search-result"
                data-ticker={sec.ticker}
                data-active={active ? "true" : "false"}
              >
                <span className="tk">{sec.ticker}</span>
                <span className="nm">{sec.name}</span>
                <span className={`mkt-badge mkt-${marketBadge(sec.exchange).toLowerCase()}`}>
                  {marketBadge(sec.exchange)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
