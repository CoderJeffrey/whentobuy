import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWatchlist } from "../hooks/useWatchlist";
import { searchSecurities } from "../lib/api";
import { formatSymbol, marketBadge } from "../lib/symbol";
import type { Security } from "../types";
import { WatchlistItem } from "./WatchlistItem";

interface Props {
  activeSymbol: string;
}

export function Watchlist({ activeSymbol }: Props) {
  const { t } = useTranslation();
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

  function handleAdd(symbol: string) {
    const sym = symbol.toUpperCase();
    if (tickers.some((item) => item.symbol === sym)) {
      flashNotice(t("watchlist.alreadyAdded", { symbol: sym }));
      setAddOpen(false);
      return;
    }
    add.mutate(sym, {
      onSuccess: (data) => {
        if (data.added) {
          flashNotice(t("watchlist.added", { symbol: sym }));
        } else {
          flashNotice(t("watchlist.alreadyAdded", { symbol: sym }));
        }
        setAddOpen(false);
      },
      onError: (err) => {
        flashNotice(err instanceof Error ? err.message : t("common.failedToAdd"));
      },
    });
  }

  function handleRemove(symbol: string) {
    const wasActive = symbol === activeSymbol;
    remove.mutate(symbol, {
      onSuccess: (data) => {
        flashNotice(t("watchlist.removed", { symbol }));
        if (wasActive) {
          const next = data.tickers[0]?.symbol ?? "AAPL.US";
          navigate(`/dashboard/${next}`);
        }
      },
      onError: (err) => {
        flashNotice(err instanceof Error ? err.message : t("common.failedToRemove"));
      },
    });
  }

  return (
    <div aria-label="Watchlist" data-testid="watchlist">
      <div className="wl-head">
        <span className="title">{t("watchlist.title")}</span>
        {tickers.length > 0 && (
          <span className="count">{t("watchlist.count", { count: tickers.length })}</span>
        )}
      </div>

      {query.isPending && <div className="wl-hint">{t("watchlist.loading")}</div>}

      {query.error && (
        <div className="wl-error">{t("watchlist.loadFailed")}</div>
      )}

      <div className="wl-list">
        {tickers.map((item) => (
          <WatchlistItem
            key={item.symbol}
            item={item}
            active={item.symbol === activeSymbol}
            onRemove={handleRemove}
            removing={remove.isPending && remove.variables === item.symbol}
          />
        ))}
      </div>

      {!query.isPending && tickers.length === 0 && (
        <div className="wl-add" style={{ cursor: "default" }}>
          {t("watchlist.empty")}
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
          {t("watchlist.add")}
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
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [composing, setComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (composing) return;
    const t = setTimeout(() => setDebounced(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q, composing]);

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
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sec = results[safeIdx];
      if (sec) onPick(formatSymbol(sec.ticker, sec.exchange));
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
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false);
            setQ(e.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("watchlist.addPlaceholder")}
          className="wl-picker-input"
          disabled={disabled}
          data-testid="watchlist-add-input"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("watchlist.cancelAdd")}
          className="wl-remove"
        >
          ✕
        </button>
      </div>

      {debounced && (
        <div className="wl-picker-results">
          {searchQ.isFetching && results.length === 0 && (
            <div className="wl-hint">{t("watchlist.searching")}</div>
          )}
          {!searchQ.isFetching && results.length === 0 && (
            <div className="wl-hint">{t("watchlist.noMatches")}</div>
          )}
          {results.map((sec, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={formatSymbol(sec.ticker, sec.exchange)}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onPick(formatSymbol(sec.ticker, sec.exchange))}
                disabled={disabled}
                className={`wl-picker-result${active ? " active" : ""}`}
                data-testid="watchlist-add-result"
                data-ticker={sec.ticker}
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
