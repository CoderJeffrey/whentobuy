import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import {
  addIndicatorToCombo,
  createCombo,
  deleteCombo,
  fetchCombos,
  fetchMarketplace,
  updateCombo,
} from "../lib/api";
import { ComboEditorModal } from "../components/ComboEditorModal";
import { IndicatorDetailModal } from "../components/IndicatorDetailModal";
import type { Combo, ComboIndicatorRef, IndicatorMeta, Timeframe } from "../types";
import { ApiError } from "../types";
import "./Indicators.css";

const ALL_CATEGORIES = "All";

const PAGE_SIZE = 20;
const MAX_COMBOS = 5;

type EditorState =
  | { kind: "closed" }
  | { kind: "create"; seedIndicator?: ComboIndicatorRef }
  | { kind: "edit"; combo: Combo };

export default function Indicators() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const marketplaceQ = useQuery({
    queryKey: ["marketplace"],
    queryFn: ({ signal }) => fetchMarketplace(signal),
    staleTime: 60 * 60_000,
  });
  const combosQ = useQuery({
    queryKey: ["combos"],
    queryFn: ({ signal }) => fetchCombos(signal),
    staleTime: 30_000,
  });

  const combos = combosQ.data ?? [];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailMeta, setDetailMeta] = useState<IndicatorMeta | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({ kind: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  function flash(message: string, ms = 2500) {
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

  function invalidateDownstream() {
    qc.invalidateQueries({ queryKey: ["combos"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  const createMut = useMutation({
    mutationFn: (input: { name: string; indicators: ComboIndicatorRef[] }) =>
      createCombo(input),
    onSuccess: () => {
      invalidateDownstream();
      flash(t("combos.created"));
      setEditorState({ kind: "closed" });
      setEditorError(null);
    },
    onError: (err) => {
      setEditorError(err instanceof Error ? err.message : t("common.failedToSave"));
    },
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      indicators: ComboIndicatorRef[];
    }) =>
      updateCombo(input.id, {
        name: input.name,
        indicators: input.indicators,
      }),
    onSuccess: () => {
      invalidateDownstream();
      flash(t("combos.saved"));
      setEditorState({ kind: "closed" });
      setEditorError(null);
    },
    onError: (err) => {
      setEditorError(err instanceof Error ? err.message : t("common.failedToSave"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCombo(id),
    onSuccess: () => {
      invalidateDownstream();
      flash(t("combos.deleted"));
      setEditorState({ kind: "closed" });
    },
  });

  const addIndMut = useMutation({
    mutationFn: ({
      comboId,
      indicatorId,
      timeframe,
    }: {
      comboId: string;
      indicatorId: string;
      timeframe: Timeframe;
    }) => addIndicatorToCombo(comboId, indicatorId, timeframe),
    onSuccess: (_data, vars) => {
      invalidateDownstream();
      const combo = combos.find((c) => c.id === vars.comboId);
      flash(t("combos.addedTo", { name: combo?.name ?? t("combos.combo") }));
    },
    onError: (err) => {
      flash(err instanceof Error ? err.message : t("common.failedToAdd"));
    },
  });

  const categories = useMemo(() => {
    const all = marketplaceQ.data ?? [];
    const counts = new Map<string, number>();
    for (const m of all) {
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [marketplaceQ.data]);

  const filtered = useMemo(() => {
    const all = marketplaceQ.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((m) => {
      if (category !== ALL_CATEGORIES && m.category !== category) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [marketplaceQ.data, query, category]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, filtered.length]);

  const atLimit = combos.length >= MAX_COMBOS;
  const total = marketplaceQ.data?.length ?? 0;
  const isLoading = marketplaceQ.isPending || combosQ.isPending;

  const metaById = useMemo(() => {
    const map = new Map<string, IndicatorMeta>();
    for (const m of marketplaceQ.data ?? []) map.set(m.id, m);
    return map;
  }, [marketplaceQ.data]);

  function comboSummary(combo: Combo): string {
    const n = combo.indicators.length;
    const noun = t("combos.indicator", { count: n });
    const abbrs = combo.indicators
      .map((ref) => metaById.get(ref.indicatorId)?.abbreviation)
      .filter((a): a is string => Boolean(a));
    if (abbrs.length === 0) return noun;
    const shown = abbrs.slice(0, 3).join(" · ");
    return `${noun} · ${shown}${abbrs.length > 3 ? " …" : ""}`;
  }

  function openCreate(seedIndicator?: ComboIndicatorRef) {
    if (atLimit) {
      flash(t("combos.limitReached", { max: MAX_COMBOS }));
      return;
    }
    setEditorError(null);
    setEditorState({ kind: "create", seedIndicator });
    setDetailMeta(null);
  }

  function openEdit(combo: Combo) {
    setEditorError(null);
    setEditorState({ kind: "edit", combo });
  }

  function handleAddToCombo(
    comboId: string,
    indicatorId: string,
    timeframe: Timeframe,
  ) {
    addIndMut.mutate({ comboId, indicatorId, timeframe });
    setDetailMeta(null);
  }

  return (
    <div className="ibg">
      <div className="bg-grid" />

      <main className="main">
        <header className="page-head">
          <h1 className="page-title">{t("indicators.title")}</h1>
          <p className="page-sub">
            <Trans
              i18nKey="indicators.subtitle"
              components={{ hl: <span className="hl" /> }}
            />
          </p>
        </header>

        {/* ===== Combos ===== */}
        <section data-testid="combos-manager">
          <div className="section-head">
            <span className="section-title">
              {t("indicators.yourCombos")}{" "}
              <span className="count">
                {t("indicators.comboCount", { count: combos.length, max: MAX_COMBOS })}
              </span>
            </span>
            <button
              type="button"
              className="new-btn"
              onClick={() => openCreate()}
              disabled={atLimit}
              title={atLimit ? t("combos.limitReached", { max: MAX_COMBOS }) : undefined}
              data-testid="combo-new"
            >
              {t("combos.new")}
            </button>
          </div>

          {combosQ.isPending ? (
            <div className="combos-empty">{t("combos.loading")}</div>
          ) : (
            <div className="combos-grid">
              {combos.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="combo-card"
                  onClick={() => openEdit(c)}
                  data-testid="combo-card"
                  data-combo-id={c.id}
                >
                  <div className="combo-name">{c.name}</div>
                  <div className="combo-count">{comboSummary(c)}</div>
                  <div className="combo-foot">
                    {t("combos.editAction")} <span className="arrow">→</span>
                  </div>
                </button>
              ))}
              <button
                type="button"
                className="combo-card new-card"
                onClick={() => openCreate()}
                disabled={atLimit}
                title={
                  atLimit ? t("combos.limitReached", { max: MAX_COMBOS }) : undefined
                }
                data-testid="combo-new-card"
              >
                <div className="plus">+</div>
                <div className="lbl">{t("combos.newCard")}</div>
              </button>
            </div>
          )}
        </section>

        {/* ===== Library ===== */}
        <section data-testid="indicator-library-section">
          <div className="section-head">
            <span className="section-title">
              {t("indicators.library")}{" "}
              {total > 0 && (
                <span className="count">{t("indicators.available", { count: total })}</span>
              )}
            </span>
          </div>

          <div className="lib-search" data-testid="marketplace-search">
            <svg
              width="16"
              height="16"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                total > 0
                  ? t("indicators.searchPlaceholder", { count: total })
                  : t("indicators.searchPlaceholderEmpty")
              }
              autoComplete="off"
              spellCheck={false}
              data-testid="marketplace-search-input"
            />
            {query ? (
              <button
                type="button"
                className="clear"
                onClick={() => setQuery("")}
                aria-label={t("indicators.clearSearch")}
              >
                ×
              </button>
            ) : (
              <span className="kbd">⌘ K</span>
            )}
          </div>

          {categories.length > 0 && (
            <div className="cat-chips" data-testid="category-chips">
              <button
                type="button"
                className={`chip${category === ALL_CATEGORIES ? " active" : ""}`}
                onClick={() => setCategory(ALL_CATEGORIES)}
              >
                {t("indicators.all")} <span className="num">{total}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  className={`chip${category === cat.name ? " active" : ""}`}
                  onClick={() => setCategory(cat.name)}
                >
                  {cat.name} <span className="num">{cat.count}</span>
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="lib-state" data-testid="marketplace-loading">
              {t("indicators.loading")}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="lib-state" data-testid="marketplace-empty">
              {query || category !== ALL_CATEGORIES
                ? t("indicators.noMatch")
                : t("indicators.none")}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="ind-grid" data-testid="marketplace-grid">
              {visible.map((m) => (
                <LibraryCard
                  key={m.id}
                  meta={m}
                  combos={combos}
                  onOpen={() => setDetailMeta(m)}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div
              ref={sentinelRef}
              className="lib-sentinel"
              data-testid="marketplace-sentinel"
            >
              {t("indicators.loadingMore")}
            </div>
          )}
        </section>
      </main>

      {notice && (
        <div className="ind-notice" role="status" data-testid="indicators-notice">
          {notice}
        </div>
      )}

      {detailMeta && (
        <IndicatorDetailModal
          meta={detailMeta}
          combos={combos}
          maxCombos={MAX_COMBOS}
          onClose={() => setDetailMeta(null)}
          onAddToCombo={(comboId, timeframe) =>
            handleAddToCombo(comboId, detailMeta.id, timeframe)
          }
          onCreateCombo={(timeframe) =>
            openCreate({ indicatorId: detailMeta.id, timeframe })
          }
        />
      )}

      {editorState.kind !== "closed" && (
        <ComboEditorModal
          mode={editorState.kind}
          initial={
            editorState.kind === "edit" ? editorState.combo : undefined
          }
          seedIndicator={
            editorState.kind === "create"
              ? editorState.seedIndicator
              : undefined
          }
          marketplace={marketplaceQ.data ?? []}
          onClose={() => {
            setEditorState({ kind: "closed" });
            setEditorError(null);
          }}
          onSave={async (input) => {
            if (editorState.kind === "create") {
              try {
                await createMut.mutateAsync(input);
              } catch {
                /* error surfaced via state */
              }
            } else {
              try {
                await updateMut.mutateAsync({
                  id: editorState.combo.id,
                  name: input.name,
                  indicators: input.indicators,
                });
              } catch {
                /* error surfaced via state */
              }
            }
          }}
          onDelete={
            editorState.kind === "edit"
              ? async () => {
                  if (
                    !window.confirm(
                      t("combos.deleteConfirm", { name: editorState.combo.name }),
                    )
                  ) {
                    return;
                  }
                  await deleteMut.mutateAsync(editorState.combo.id);
                }
              : undefined
          }
          error={
            editorError ??
            (createMut.error instanceof ApiError
              ? createMut.error.message
              : null)
          }
        />
      )}

    </div>
  );
}

function LibraryCard({
  meta,
  combos,
  onOpen,
}: {
  meta: IndicatorMeta;
  combos: Combo[];
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const inCombos = combos.filter((c) =>
    c.indicators.some((ref) => ref.indicatorId === meta.id),
  ).length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`ind-card${inCombos > 0 ? " in-combo" : ""}`}
      data-testid="marketplace-card"
      data-card-id={meta.id}
    >
      <div className="ind-head">
        <span className="ind-code">{meta.abbreviation}</span>
        {inCombos > 0 && (
          <span
            className="ind-tag"
            title={t("combos.inComboTitle", { count: inCombos })}
          >
            <span className="dot" />
            {t("combos.inCount", { count: inCombos })}
          </span>
        )}
      </div>

      <div className="ind-name">{meta.label}</div>
      <div className="ind-desc" title={meta.description}>
        {meta.description}
      </div>

      <div className="ind-foot">
        <span className="cat">{meta.category}</span>
        <span>
          {t("indicators.tap")} <span className="arrow">→</span>
        </span>
      </div>
    </button>
  );
}
