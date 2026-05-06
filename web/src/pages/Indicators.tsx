import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLibraryIndicator,
  fetchLibrary,
  fetchMarketplace,
  removeLibraryIndicator,
} from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import type { IndicatorMeta } from "../types";

const PAGE_SIZE = 20;

type CardMode = "idle" | "confirm-add" | "confirm-remove";

export default function Indicators() {
  const qc = useQueryClient();

  const marketplaceQ = useQuery({
    queryKey: ["marketplace"],
    queryFn: ({ signal }) => fetchMarketplace(signal),
    staleTime: 60 * 60_000,
  });
  const libraryQ = useQuery({
    queryKey: ["library"],
    queryFn: ({ signal }) => fetchLibrary(signal),
    staleTime: 60_000,
  });

  const libraryIds = useMemo(
    () => new Set((libraryQ.data ?? []).map((m) => m.id)),
    [libraryQ.data],
  );

  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<CardMode>("idle");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pendingMode === "idle") return;
    function onClick(e: MouseEvent) {
      const grid = gridRef.current;
      if (!grid) return;
      const target = e.target as Node | null;
      if (!target) return;
      const card = (target as HTMLElement).closest("[data-card-id]");
      if (!card) {
        setPendingId(null);
        setPendingMode("idle");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pendingMode]);

  function clearError() {
    setErrorMsg(null);
  }

  const addMut = useMutation({
    mutationFn: (id: string) => addLibraryIndicator(id),
    onMutate: async (id: string) => {
      clearError();
      await qc.cancelQueries({ queryKey: ["library"] });
      const prev = qc.getQueryData<IndicatorMeta[]>(["library"]);
      const meta = (marketplaceQ.data ?? []).find((m) => m.id === id);
      if (prev && meta && !prev.some((m) => m.id === id)) {
        qc.setQueryData<IndicatorMeta[]>(["library"], [...prev, meta]);
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["library"], ctx.prev);
      setErrorMsg("Could not add indicator. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeLibraryIndicator(id),
    onMutate: async (id: string) => {
      clearError();
      await qc.cancelQueries({ queryKey: ["library"] });
      await qc.cancelQueries({ queryKey: ["config"] });
      const prevLib = qc.getQueryData<IndicatorMeta[]>(["library"]);
      if (prevLib) {
        qc.setQueryData<IndicatorMeta[]>(
          ["library"],
          prevLib.filter((m) => m.id !== id),
        );
      }
      return { prevLib };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevLib) qc.setQueryData(["library"], ctx.prevLib);
      setErrorMsg("Could not remove indicator. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["config"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function startAdd(id: string) {
    setPendingId(id);
    setPendingMode("confirm-add");
  }
  function startRemove(id: string) {
    setPendingId(id);
    setPendingMode("confirm-remove");
  }
  function cancelPending() {
    setPendingId(null);
    setPendingMode("idle");
  }
  function confirmAdd(id: string) {
    cancelPending();
    addMut.mutate(id);
  }
  function confirmRemove(id: string) {
    cancelPending();
    removeMut.mutate(id);
  }

  const isLoading = marketplaceQ.isPending || libraryQ.isPending;
  const total = marketplaceQ.data?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title="Indicators"
        description="Browse and add to your library. Configure tiers on the Dashboard."
      />

      <div
        className="mt-2 mb-6 flex items-center gap-3 px-4 py-3 rounded-xl"
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

      {errorMsg && (
        <div
          className="mb-4 p-3 rounded-md text-xs"
          style={{
            backgroundColor: "var(--bg-card-raised)",
            border: "1px solid var(--negative)",
            color: "var(--negative)",
          }}
          data-testid="marketplace-error"
        >
          {errorMsg}
        </div>
      )}

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
        <div ref={gridRef} className="marketplace-grid" data-testid="marketplace-grid">
          {visible.map((m) => {
            const inLibrary = libraryIds.has(m.id);
            const isPending = pendingId === m.id;
            const cardMode: CardMode =
              isPending && pendingMode !== "idle" ? pendingMode : "idle";
            return (
              <MarketplaceCard
                key={m.id}
                meta={m}
                inLibrary={inLibrary}
                mode={cardMode}
                onStartAdd={() => startAdd(m.id)}
                onConfirmAdd={() => confirmAdd(m.id)}
                onStartRemove={() => startRemove(m.id)}
                onConfirmRemove={() => confirmRemove(m.id)}
                onCancel={cancelPending}
              />
            );
          })}
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

      <style>{`
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

function MarketplaceCard({
  meta,
  inLibrary,
  mode,
  onStartAdd,
  onConfirmAdd,
  onStartRemove,
  onConfirmRemove,
  onCancel,
}: {
  meta: IndicatorMeta;
  inLibrary: boolean;
  mode: CardMode;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onStartRemove: () => void;
  onConfirmRemove: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-card-id={meta.id}
      data-testid="marketplace-card"
      data-in-library={inLibrary ? "true" : "false"}
      data-mode={mode}
      className="rounded-xl p-4 flex flex-col gap-3 transition-colors"
      style={{
        backgroundColor: "var(--bg-card)",
        border: `1px solid ${
          mode !== "idle" ? "var(--border-strong)" : "var(--border)"
        }`,
        minHeight: 168,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-mono"
          style={{ color: "var(--accent)", fontWeight: 600 }}
        >
          {meta.abbreviation}
        </span>
        {inLibrary && mode === "idle" && (
          <span
            className="text-[10px] tracking-label uppercase"
            style={{ color: "var(--positive)" }}
            aria-hidden
          >
            ✓
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

      <div className="mt-auto">
        <CardAction
          inLibrary={inLibrary}
          mode={mode}
          onStartAdd={onStartAdd}
          onConfirmAdd={onConfirmAdd}
          onStartRemove={onStartRemove}
          onConfirmRemove={onConfirmRemove}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

function CardAction({
  inLibrary,
  mode,
  onStartAdd,
  onConfirmAdd,
  onStartRemove,
  onConfirmRemove,
  onCancel,
}: {
  inLibrary: boolean;
  mode: CardMode;
  onStartAdd: () => void;
  onConfirmAdd: () => void;
  onStartRemove: () => void;
  onConfirmRemove: () => void;
  onCancel: () => void;
}) {
  if (mode === "confirm-add") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirmAdd}
          className="flex-1 px-2 py-1.5 rounded-md text-xs"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--bg-page)",
            fontWeight: 500,
          }}
          data-testid="card-confirm-add"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-2 py-1.5 rounded-md text-xs"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          data-testid="card-cancel"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "confirm-remove") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirmRemove}
          className="flex-1 px-2 py-1.5 rounded-md text-xs"
          style={{
            backgroundColor: "var(--negative)",
            color: "var(--bg-page)",
            fontWeight: 500,
          }}
          data-testid="card-confirm-remove"
        >
          Confirm Remove
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-2 py-1.5 rounded-md text-xs"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          data-testid="card-cancel"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (inLibrary) {
    return (
      <button
        type="button"
        onClick={onStartRemove}
        className="w-full px-2 py-1.5 rounded-md text-xs added-chip"
        style={{
          backgroundColor: "var(--bg-card-raised)",
          color: "var(--positive)",
          border: "1px solid var(--border)",
          fontWeight: 500,
        }}
        data-testid="card-added"
      >
        <span className="added-label">✓ Added</span>
        <span className="remove-label">Remove</span>
        <style>{`
          .added-chip .remove-label { display: none; }
          .added-chip:hover {
            color: var(--negative);
            border-color: var(--negative);
          }
          .added-chip:hover .added-label { display: none; }
          .added-chip:hover .remove-label { display: inline; }
        `}</style>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartAdd}
      className="w-full px-2 py-1.5 rounded-md text-xs transition-colors"
      style={{
        backgroundColor: "transparent",
        color: "var(--accent)",
        border: "1px solid var(--border-strong)",
        fontWeight: 500,
      }}
      data-testid="card-add"
    >
      + Add
    </button>
  );
}
