import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { NavBar } from "../components/NavBar";
import { fetchConfig, fetchIndicators, saveConfig } from "../lib/api";
import type { IndicatorId, IndicatorMeta, Tier, UserWeights } from "../types";

const TIERS: { tier: Tier; label: string; points: number; sublabel: string }[] =
  [
    { tier: "high", label: "HIGH IMPORTANCE", points: 10, sublabel: "10 pts each" },
    { tier: "medium", label: "MEDIUM IMPORTANCE", points: 5, sublabel: "5 pts each" },
    { tier: "low", label: "LOW IMPORTANCE", points: 2, sublabel: "2 pts each" },
  ];

export default function Weights() {
  const qc = useQueryClient();
  const indicatorsQ = useQuery({
    queryKey: ["indicators"],
    queryFn: fetchIndicators,
  });
  const configQ = useQuery({ queryKey: ["config"], queryFn: fetchConfig });

  const [draft, setDraft] = useState<UserWeights | null>(null);
  const [pickerTier, setPickerTier] = useState<Tier | null>(null);

  const weights = draft ?? configQ.data?.weights ?? {};
  const isDirty =
    draft != null &&
    JSON.stringify(draft) !== JSON.stringify(configQ.data?.weights ?? {});

  const byId = useMemo(() => {
    const map = new Map<IndicatorId, IndicatorMeta>();
    for (const m of indicatorsQ.data ?? []) map.set(m.id, m);
    return map;
  }, [indicatorsQ.data]);

  const byTier = useMemo(() => {
    const out: Record<Tier, IndicatorId[]> = { high: [], medium: [], low: [] };
    for (const [id, tier] of Object.entries(weights) as [
      IndicatorId,
      Tier,
    ][]) {
      if (tier && out[tier]) out[tier].push(id);
    }
    return out;
  }, [weights]);

  const usedIds = useMemo(() => new Set(Object.keys(weights)), [weights]);

  const saveMut = useMutation({
    mutationFn: (w: UserWeights) => saveConfig({ weights: w }),
    onSuccess: (saved) => {
      qc.setQueryData(["config"], saved);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDraft(null);
    },
  });

  function update(next: UserWeights) {
    setDraft(next);
  }

  function remove(id: IndicatorId) {
    const next = { ...weights };
    delete next[id];
    update(next);
  }

  function changeTier(id: IndicatorId, tier: Tier) {
    update({ ...weights, [id]: tier });
  }

  function addToTier(id: IndicatorId, tier: Tier) {
    update({ ...weights, [id]: tier });
    setPickerTier(null);
  }

  function reset() {
    setDraft(null);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <NavBar />

        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Indicator Weights</h2>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Drop indicators into tiers. HIGH counts for 10 points, MEDIUM for
              5, LOW for 2.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-md text-sm"
                style={{
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
                data-testid="weights-reset"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={!isDirty || saveMut.isPending}
              onClick={() => saveMut.mutate(weights)}
              className="px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
              style={{
                backgroundColor: "var(--gold)",
                color: "#0a0a0a",
              }}
              data-testid="weights-save"
            >
              {saveMut.isPending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        {saveMut.error && (
          <div
            className="mb-4 p-3 rounded-md text-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--rating-immediate_sell)",
              color: "var(--rating-immediate_sell)",
            }}
            data-testid="weights-error"
          >
            {saveMut.error instanceof Error
              ? saveMut.error.message
              : "Save failed"}
          </div>
        )}

        <div
          className="grid gap-6 pb-12"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          {TIERS.map(({ tier, label, sublabel }) => (
            <div
              key={tier}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                minHeight: 280,
              }}
              data-testid={`tier-column-${tier}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-xs font-semibold tracking-wider"
                  style={{ color: `var(--tier-${tier})` }}
                >
                  {label}
                </div>
                <div
                  className="text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {sublabel}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {byTier[tier].map((id) => {
                  const meta = byId.get(id);
                  if (!meta) return null;
                  return (
                    <IndicatorCard
                      key={id}
                      meta={meta}
                      currentTier={tier}
                      onChangeTier={(t) => changeTier(id, t)}
                      onRemove={() => remove(id)}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPickerTier(tier)}
                className="mt-auto rounded-md py-2 text-sm border-dashed"
                style={{
                  color: "var(--text-muted)",
                  border: "1px dashed var(--border)",
                  backgroundColor: "transparent",
                }}
                data-testid={`tier-add-${tier}`}
              >
                + Add indicator
              </button>
            </div>
          ))}
        </div>
      </div>

      {pickerTier && (
        <IndicatorPicker
          tier={pickerTier}
          indicators={indicatorsQ.data ?? []}
          usedIds={usedIds}
          onPick={(id) => addToTier(id, pickerTier)}
          onClose={() => setPickerTier(null)}
        />
      )}
    </div>
  );
}

function IndicatorCard({
  meta,
  currentTier,
  onChangeTier,
  onRemove,
}: {
  meta: IndicatorMeta;
  currentTier: Tier;
  onChangeTier: (t: Tier) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{
        backgroundColor: "var(--bg-card-hover)",
        border: "1px solid var(--border)",
      }}
      data-testid="indicator-card"
      data-indicator-id={meta.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">{meta.label}</div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${meta.label}`}
          className="text-lg leading-none"
          style={{ color: "var(--text-muted)" }}
          data-testid="indicator-remove"
        >
          ×
        </button>
      </div>
      <div
        className="text-xs font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        {meta.abbreviation} · {meta.category.replace("_", " ")}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {meta.description}
      </div>
      <div className="flex gap-1 mt-2">
        {(["high", "medium", "low"] as Tier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChangeTier(t)}
            className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider"
            style={
              t === currentTier
                ? {
                    backgroundColor: `var(--tier-${t})`,
                    color: "#0a0a0a",
                  }
                : {
                    color: `var(--tier-${t})`,
                    border: `1px solid var(--tier-${t})`,
                    opacity: 0.6,
                  }
            }
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function IndicatorPicker({
  tier,
  indicators,
  usedIds,
  onPick,
  onClose,
}: {
  tier: Tier;
  indicators: IndicatorMeta[];
  usedIds: Set<string>;
  onPick: (id: IndicatorId) => void;
  onClose: () => void;
}) {
  const available = indicators.filter((m) => !usedIds.has(m.id));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      data-testid="indicator-picker"
    >
      <div
        className="rounded-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-auto"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Add to{" "}
            <span style={{ color: `var(--tier-${tier})` }}>
              {tier.toUpperCase()}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {available.length === 0 && (
          <div
            className="py-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            All indicators already assigned.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {available.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className="text-left rounded-lg p-3 flex flex-col gap-1"
              style={{
                backgroundColor: "var(--bg-card-hover)",
                border: "1px solid var(--border)",
              }}
              data-testid="picker-option"
              data-indicator-id={m.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{m.label}</span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {m.abbreviation}
                </span>
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {m.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
