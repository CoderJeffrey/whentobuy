import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PageHeader } from "../components/PageHeader";
import type { Combo, IndicatorMeta } from "../types";
import { ApiError } from "../types";

const PAGE_SIZE = 20;
const MAX_COMBOS = 5;

type EditorState =
  | { kind: "closed" }
  | { kind: "create"; seedIndicatorId?: string }
  | { kind: "edit"; combo: Combo };

export default function Indicators() {
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
    mutationFn: (input: { name: string; indicatorIds: string[] }) =>
      createCombo(input),
    onSuccess: () => {
      invalidateDownstream();
      flash("Combo created");
      setEditorState({ kind: "closed" });
      setEditorError(null);
    },
    onError: (err) => {
      setEditorError(err instanceof Error ? err.message : "Failed to save");
    },
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      indicatorIds: string[];
    }) =>
      updateCombo(input.id, {
        name: input.name,
        indicatorIds: input.indicatorIds,
      }),
    onSuccess: () => {
      invalidateDownstream();
      flash("Combo saved");
      setEditorState({ kind: "closed" });
      setEditorError(null);
    },
    onError: (err) => {
      setEditorError(err instanceof Error ? err.message : "Failed to save");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCombo(id),
    onSuccess: () => {
      invalidateDownstream();
      flash("Combo deleted");
      setEditorState({ kind: "closed" });
    },
  });

  const addIndMut = useMutation({
    mutationFn: ({
      comboId,
      indicatorId,
    }: {
      comboId: string;
      indicatorId: string;
    }) => addIndicatorToCombo(comboId, indicatorId),
    onSuccess: (_data, vars) => {
      invalidateDownstream();
      const combo = combos.find((c) => c.id === vars.comboId);
      flash(`Added to ${combo?.name ?? "combo"}`);
    },
    onError: (err) => {
      flash(err instanceof Error ? err.message : "Failed to add");
    },
  });

  const filtered = useMemo(() => {
    const all = marketplaceQ.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [marketplaceQ.data, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

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

  function openCreate(seedIndicatorId?: string) {
    if (atLimit) {
      flash(`Combo limit reached (${MAX_COMBOS}).`);
      return;
    }
    setEditorError(null);
    setEditorState({ kind: "create", seedIndicatorId });
    setDetailMeta(null);
  }

  function openEdit(combo: Combo) {
    setEditorError(null);
    setEditorState({ kind: "edit", combo });
  }

  function handleAddToCombo(comboId: string, indicatorId: string) {
    addIndMut.mutate({ comboId, indicatorId });
    setDetailMeta(null);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title="Indicators"
        description="Combine indicators into combos. A combo turns GREEN when every indicator in it triggers."
      />

      <section className="mt-2 mb-8" data-testid="combos-manager">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="text-[11px] tracking-label uppercase"
            style={{ color: "var(--text-secondary)", fontWeight: 500 }}
          >
            Your Combos ({combos.length} / {MAX_COMBOS})
          </h2>
          <button
            type="button"
            onClick={() => openCreate()}
            disabled={atLimit}
            className="px-3 py-1.5 rounded-md text-xs tracking-label uppercase"
            style={{
              color: atLimit ? "var(--text-tertiary)" : "var(--accent)",
              border: `1px solid ${
                atLimit ? "var(--border)" : "var(--border-strong)"
              }`,
              backgroundColor: "transparent",
              fontWeight: 500,
              cursor: atLimit ? "not-allowed" : "pointer",
            }}
            title={atLimit ? `Combo limit reached (${MAX_COMBOS})` : undefined}
            data-testid="combo-new"
          >
            + New Combo
          </button>
        </div>

        {combosQ.isPending ? (
          <div
            className="py-6 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Loading combos…
          </div>
        ) : combos.length === 0 ? (
          <div
            className="py-10 text-center text-sm rounded-xl"
            style={{
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-card)",
              border: "1px dashed var(--border)",
            }}
          >
            No combos yet. Create one to get started.
          </div>
        ) : (
          <div className="combos-grid">
            {combos.map((c) => (
              <ComboCard key={c.id} combo={c} onEdit={() => openEdit(c)} />
            ))}
          </div>
        )}
      </section>

      <section data-testid="indicator-library-section">
        <h2
          className="text-[11px] tracking-label uppercase mb-3"
          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
        >
          Indicator Library
        </h2>

        <div
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          data-testid="marketplace-search"
        >
          <span style={{ color: "var(--text-tertiary)" }} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${total > 0 ? `${total}+ ` : ""}indicators...`}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-(--text-tertiary)"
            style={{ color: "var(--text-primary)" }}
            autoComplete="off"
            spellCheck={false}
            data-testid="marketplace-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-base leading-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              ×
            </button>
          )}
        </div>

        {isLoading && (
          <div
            className="py-16 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
            data-testid="marketplace-loading"
          >
            Loading indicators…
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div
            className="py-16 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
            data-testid="marketplace-empty"
          >
            {query
              ? `No indicators match "${query}".`
              : "No indicators available."}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="marketplace-grid" data-testid="marketplace-grid">
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
            className="py-6 text-center text-xs tracking-label uppercase"
            style={{ color: "var(--text-tertiary)" }}
            data-testid="marketplace-sentinel"
          >
            Loading more…
          </div>
        )}
      </section>

      {notice && (
        <div
          className="fixed bottom-6 right-6 text-[11px] px-3 py-2 rounded-md"
          role="status"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card-raised)",
            border: "1px solid var(--border)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
          }}
          data-testid="indicators-notice"
        >
          {notice}
        </div>
      )}

      {detailMeta && (
        <IndicatorDetailModal
          meta={detailMeta}
          combos={combos}
          maxCombos={MAX_COMBOS}
          onClose={() => setDetailMeta(null)}
          onAddToCombo={(comboId) =>
            handleAddToCombo(comboId, detailMeta.id)
          }
          onCreateCombo={() => openCreate(detailMeta.id)}
        />
      )}

      {editorState.kind !== "closed" && (
        <ComboEditorModal
          mode={editorState.kind}
          initial={
            editorState.kind === "edit" ? editorState.combo : undefined
          }
          seedIndicatorId={
            editorState.kind === "create"
              ? editorState.seedIndicatorId
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
                  indicatorIds: input.indicatorIds,
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
                      `Delete combo "${editorState.combo.name}"? This can't be undone.`,
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

      <style>{`
        .combos-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }
        .marketplace-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 900px) {
          .marketplace-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1200px) {
          .marketplace-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (min-width: 1440px) {
          .marketplace-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}

function ComboCard({ combo, onEdit }: { combo: Combo; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="text-left rounded-xl p-4 flex flex-col gap-3 transition-colors hover:[border-color:var(--border-strong)]"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        minHeight: 120,
      }}
      data-testid="combo-card"
      data-combo-id={combo.id}
    >
      <div
        className="text-sm"
        style={{ color: "var(--text-primary)", fontWeight: 500 }}
      >
        {combo.name}
      </div>
      <div
        className="text-[11px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {combo.indicatorIds.length}{" "}
        {combo.indicatorIds.length === 1 ? "indicator" : "indicators"}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span
          className="text-[10px] tracking-label uppercase"
          style={{ color: "var(--accent)" }}
        >
          Edit →
        </span>
      </div>
    </button>
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
  const inCombos = combos.filter((c) => c.indicatorIds.includes(meta.id))
    .length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl p-4 flex flex-col gap-3 transition-colors text-left"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        minHeight: 168,
      }}
      data-testid="marketplace-card"
      data-card-id={meta.id}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-mono"
          style={{ color: "var(--accent)", fontWeight: 600 }}
        >
          {meta.abbreviation}
        </span>
        {inCombos > 0 && (
          <span
            className="text-[10px] tracking-label uppercase"
            style={{ color: "var(--positive)" }}
            title={`In ${inCombos} ${inCombos === 1 ? "combo" : "combos"}`}
          >
            in {inCombos}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <span
          className="text-[13px] leading-snug"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          {meta.label}
        </span>
        <span
          className="text-xs leading-snug line-clamp-3"
          style={{ color: "var(--text-secondary)" }}
          title={meta.description}
        >
          {meta.description}
        </span>
      </div>

      <span
        className="text-[10px] tracking-label uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        Tap for details →
      </span>
    </button>
  );
}
