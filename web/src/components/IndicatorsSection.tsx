import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchConfig,
  fetchLibrary,
  fetchMarketplace,
  saveConfig,
} from "../lib/api";
import type {
  DashboardResponse,
  IndicatorId,
  IndicatorMeta,
  Tier,
  UserConfig,
  UserWeights,
} from "../types";
import { IndicatorCard } from "./IndicatorCard";
import { IndicatorPicker } from "./IndicatorPicker";

const TIERS: { tier: Tier; label: string; sub: string }[] = [
  { tier: "high", label: "HIGH IMPORTANCE", sub: "10 pts each" },
  { tier: "medium", label: "MEDIUM IMPORTANCE", sub: "5 pts each" },
  { tier: "low", label: "LOW IMPORTANCE", sub: "2 pts each" },
];

const TIER_POINTS: Record<Tier, number> = { high: 10, medium: 5, low: 2 };

export function IndicatorsSection({ data }: { data: DashboardResponse }) {
  const qc = useQueryClient();

  const indicatorsQ = useQuery({
    queryKey: ["marketplace"],
    queryFn: ({ signal }) => fetchMarketplace(signal),
    staleTime: 60 * 60_000,
  });
  const libraryQ = useQuery({
    queryKey: ["library"],
    queryFn: ({ signal }) => fetchLibrary(signal),
    staleTime: 60_000,
  });
  const configQ = useQuery({ queryKey: ["config"], queryFn: fetchConfig });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<IndicatorId | null>(
    null,
  );

  const weights = configQ.data?.weights ?? {};

  const saveMut = useMutation({
    mutationFn: (w: UserWeights) => saveConfig({ weights: w }),
    onSuccess: (saved) => {
      qc.setQueryData(["config"], saved);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function applyWeights(next: UserWeights) {
    qc.setQueryData<UserConfig>(["config"], { weights: next });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveMut.mutate(next), 500);
  }

  function confirmRemove(id: IndicatorId) {
    const next = { ...weights };
    delete next[id];
    setPendingRemoveId(null);
    applyWeights(next);
  }

  function addIndicators(ids: IndicatorId[], tier: Tier) {
    const next: UserWeights = { ...weights };
    for (const id of ids) next[id] = tier;
    applyWeights(next);
    setPickerOpen(false);
  }

  const metaById = useMemo(() => {
    const map = new Map<IndicatorId, IndicatorMeta>();
    for (const m of indicatorsQ.data ?? []) map.set(m.id, m);
    return map;
  }, [indicatorsQ.data]);

  const breakdownById = useMemo(() => {
    const map = new Map<
      IndicatorId,
      { triggered: boolean; displayValue: string }
    >();
    for (const b of data.score.breakdown) {
      map.set(b.id, { triggered: b.triggered, displayValue: b.displayValue });
    }
    return map;
  }, [data.score.breakdown]);

  const idsByTier: Record<Tier, IndicatorId[]> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const [id, t] of Object.entries(weights) as [IndicatorId, Tier][]) {
    if (t && idsByTier[t]) idsByTier[t].push(id);
  }
  for (const t of Object.keys(idsByTier) as Tier[]) {
    idsByTier[t].sort((a, b) => a.localeCompare(b));
  }

  const usedIds = new Set<string>(Object.keys(weights));
  const totalCount = usedIds.size;

  return (
    <section
      className="rounded-2xl p-8"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      data-testid="indicators-section"
    >
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-xs tracking-label uppercase"
          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
        >
          Indicators
        </h3>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="px-3 py-1.5 rounded-md text-xs tracking-label uppercase"
          style={{
            color: "var(--accent)",
            border: "1px solid var(--border-strong)",
            backgroundColor: "transparent",
            fontWeight: 500,
          }}
          data-testid="indicators-add"
        >
          + Add
        </button>
      </div>

      {totalCount === 0 && (
        <div
          className="py-16 text-center flex flex-col items-center gap-4"
          data-testid="indicators-empty"
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No indicators configured yet.
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2 rounded-md text-sm"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg-page)",
              fontWeight: 500,
            }}
            data-testid="indicators-add-first"
          >
            + Add your first indicator
          </button>
        </div>
      )}

      {totalCount > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          data-testid="indicator-grid"
        >
          {TIERS.map(({ tier, label, sub }) => (
            <div
              key={tier}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "var(--bg-card-raised)",
                border: "1px solid var(--border)",
                minHeight: 200,
              }}
              data-testid={`tier-section-${tier}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-[10px] tracking-label uppercase"
                  style={{ color: `var(--tier-${tier})`, fontWeight: 500 }}
                >
                  {label}
                </div>
                <div
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {sub}
                </div>
              </div>

              <div
                className="flex flex-col gap-3 overflow-y-auto pr-1 tier-scroll"
                style={{ maxHeight: "28rem" }}
                data-testid={`tier-list-${tier}`}
              >
                {idsByTier[tier].length === 0 && (
                  <div
                    className="text-xs italic py-4 text-center"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Empty
                  </div>
                )}
                {idsByTier[tier].map((id) => {
                  const meta = metaById.get(id);
                  const live = breakdownById.get(id);
                  const triggered = live?.triggered ?? false;
                  const displayValue = live?.displayValue ?? "";
                  return (
                    <IndicatorCard
                      key={id}
                      id={id}
                      label={meta?.label ?? id}
                      abbreviation={meta?.abbreviation ?? ""}
                      category={meta?.category ?? ""}
                      description={meta?.description ?? ""}
                      displayValue={displayValue}
                      tier={tier}
                      triggered={triggered}
                      points={triggered ? TIER_POINTS[tier] : 0}
                      pendingRemove={pendingRemoveId === id}
                      onRemove={() => setPendingRemoveId(id)}
                      onCancelRemove={() => setPendingRemoveId(null)}
                      onConfirmRemove={() => confirmRemove(id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {saveMut.error && (
        <div
          className="mt-4 p-3 rounded-md text-xs"
          style={{
            backgroundColor: "var(--bg-card-raised)",
            border: "1px solid var(--negative)",
            color: "var(--negative)",
          }}
          data-testid="indicators-save-error"
        >
          {saveMut.error instanceof Error
            ? saveMut.error.message
            : "Save failed"}
        </div>
      )}

      {pickerOpen && (
        <IndicatorPicker
          indicators={libraryQ.data ?? []}
          usedIds={usedIds}
          emptyLibrary={(libraryQ.data ?? []).length === 0}
          onAdd={addIndicators}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  );
}
