import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { searchSecurities } from "../lib/api";
import type { Security } from "../types";

export function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
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
  const safeIdx = results.length > 0 ? Math.min(activeIdx, results.length - 1) : 0;

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
    navigate(`/ticker/${sec.ticker}`);
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
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md"
        style={{
          backgroundColor: "var(--bg-card-hover)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--text-muted)" }} aria-hidden>
          🔍
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search stocks..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)" }}
          data-testid="search-input"
          aria-label="Search stocks"
          autoComplete="off"
          spellCheck={false}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setDebounced("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="text-base leading-none"
            style={{ color: "var(--text-muted)" }}
            data-testid="search-clear"
          >
            ×
          </button>
        )}
      </div>

      {open && debounced && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-md overflow-hidden z-50"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
          data-testid="search-dropdown"
        >
          {searchQ.isFetching && results.length === 0 && (
            <div
              className="px-3 py-3 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Searching…
            </div>
          )}
          {!searchQ.isFetching && results.length === 0 && (
            <div
              className="px-3 py-3 text-xs"
              style={{ color: "var(--text-muted)" }}
              data-testid="search-empty"
            >
              No matches.
            </div>
          )}
          {results.map((sec, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={sec.ticker}
                type="button"
                onClick={() => pick(sec)}
                onMouseEnter={() => setActiveIdx(i)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm"
                style={{
                  backgroundColor: active
                    ? "var(--bg-card-hover)"
                    : "transparent",
                }}
                data-testid="search-result"
                data-ticker={sec.ticker}
                data-active={active ? "true" : "false"}
              >
                <span
                  className="font-mono font-semibold"
                  style={{ color: "var(--gold)", minWidth: 56 }}
                >
                  {sec.ticker}
                </span>
                <span className="truncate flex-1">{sec.name}</span>
                {sec.sector && (
                  <span
                    className="text-[10px] truncate max-w-[140px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {sec.sector}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
