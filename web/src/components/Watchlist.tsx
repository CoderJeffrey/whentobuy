import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import { searchSecurities } from "../lib/api";
import type { Security } from "../types";
import { WatchlistItem } from "./WatchlistItem";

interface Props {
  activeTicker: string;
}

export function Watchlist({ activeTicker }: Props) {
  const navigate = useNavigate();
  const { query, add, remove } = useWatchlist();
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  function flashNotice(message: string, ms = 2500) {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms);
  }

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const tickers = query.data?.tickers ?? [];

  function handleAdd(ticker: string) {
    const sym = ticker.toUpperCase();
    if (tickers.some((t) => t.ticker === sym)) {
      flashNotice(`${sym} is already in your watchlist`);
      setAddOpen(false);
      return;
    }
    add.mutate(sym, {
      onSuccess: (data) => {
        if (data.added) {
          flashNotice(`${sym} added to watchlist`);
        } else {
          flashNotice(`${sym} is already in your watchlist`);
        }
        setAddOpen(false);
      },
      onError: (err) => {
        flashNotice(err instanceof Error ? err.message : "Failed to add");
      },
    });
  }

  function handleRemove(ticker: string) {
    const wasActive = ticker === activeTicker;
    remove.mutate(ticker, {
      onSuccess: (data) => {
        flashNotice(`${ticker} removed`);
        if (wasActive) {
          const next = data.tickers[0]?.ticker ?? "AAPL";
          navigate(`/dashboard/${next}`);
        }
      },
      onError: (err) => {
        flashNotice(err instanceof Error ? err.message : "Failed to remove");
      },
    });
  }

  return (
    <div aria-label="Watchlist" data-testid="watchlist">
      <div className="wl-head">
        <span className="title">Watchlist</span>
        {tickers.length > 0 && (
          <span className="count">{tickers.length} / 50</span>
        )}
      </div>

      {query.isPending && <div className="wl-hint">Loading watchlist…</div>}

      {query.error && (
        <div className="wl-error">Failed to load watchlist</div>
      )}

      <div className="wl-list">
        {tickers.map((item) => (
          <WatchlistItem
            key={item.ticker}
            item={item}
            active={item.ticker === activeTicker}
            onRemove={handleRemove}
            removing={remove.isPending && remove.variables === item.ticker}
          />
        ))}
      </div>

      {!query.isPending && tickers.length === 0 && (
        <div className="wl-add" style={{ cursor: "default" }}>
          No tickers yet
        </div>
      )}

      {addOpen ? (
        <AddPicker
          onPick={handleAdd}
          onCancel={() => setAddOpen(false)}
          disabled={add.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="wl-add"
          data-testid="watchlist-add-open"
        >
          + Add to watchlist
        </button>
      )}

      {notice && (
        <div className="wl-notice" role="status" data-testid="watchlist-notice">
          {notice}
        </div>
      )}
    </div>
  );
}

interface AddPickerProps {
  onPick: (ticker: string) => void;
  onCancel: () => void;
  disabled: boolean;
}

function AddPicker({ onPick, onCancel, disabled }: AddPickerProps) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sec = results[safeIdx];
      if (sec) onPick(sec.ticker);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="wl-picker" data-testid="watchlist-add-picker">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Add ticker…"
          className="wl-picker-input"
          disabled={disabled}
          data-testid="watchlist-add-input"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel add"
          className="wl-remove"
        >
          ✕
        </button>
      </div>

      {debounced && (
        <div className="wl-picker-results">
          {searchQ.isFetching && results.length === 0 && (
            <div className="wl-hint">Searching…</div>
          )}
          {!searchQ.isFetching && results.length === 0 && (
            <div className="wl-hint">No matches.</div>
          )}
          {results.map((sec, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={sec.ticker}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onPick(sec.ticker)}
                disabled={disabled}
                className={`wl-picker-result${active ? " active" : ""}`}
                data-testid="watchlist-add-result"
                data-ticker={sec.ticker}
              >
                <span className="tk">{sec.ticker}</span>
                <span className="nm">{sec.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
