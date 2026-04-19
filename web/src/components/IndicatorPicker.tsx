import { useState } from "react";
import type { IndicatorId, IndicatorMeta, Tier } from "../types";

const TIERS: { tier: Tier; label: string; sub: string }[] = [
  { tier: "high", label: "HIGH", sub: "10 pts" },
  { tier: "medium", label: "MEDIUM", sub: "5 pts" },
  { tier: "low", label: "LOW", sub: "2 pts" },
];

export function IndicatorPicker({
  indicators,
  usedIds,
  initialTier = "medium",
  onPick,
  onClose,
}: {
  indicators: IndicatorMeta[];
  usedIds: Set<string>;
  initialTier?: Tier;
  onPick: (id: IndicatorId, tier: Tier) => void;
  onClose: () => void;
}) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const available = indicators.filter((m) => !usedIds.has(m.id));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(15, 15, 14, 0.72)" }}
      onClick={onClose}
      data-testid="indicator-picker"
    >
      <div
        className="rounded-2xl p-8 w-full max-w-xl max-h-[80vh] overflow-auto"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-xs tracking-label uppercase"
            style={{ color: "var(--text-secondary)", fontWeight: 500 }}
          >
            Add indicator
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-5">
          <div
            className="text-[10px] tracking-label uppercase mb-3"
            style={{ color: "var(--text-tertiary)", fontWeight: 500 }}
          >
            Add to section
          </div>
          <div className="flex gap-2" data-testid="picker-tier-toggle">
            {TIERS.map(({ tier: t, label, sub }) => {
              const selected = t === tier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className="flex-1 px-3 py-2.5 rounded-md text-xs tracking-label uppercase flex flex-col items-center gap-0.5 transition-colors"
                  style={
                    selected
                      ? {
                          backgroundColor: `rgba(${t === "high" ? "166, 107, 107" : t === "medium" ? "156, 133, 71" : "97, 96, 92"}, 0.9)`,
                          color: "var(--text-primary)",
                          border: `1px solid var(--tier-${t})`,
                          fontWeight: 500,
                        }
                      : {
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                          backgroundColor: "transparent",
                          fontWeight: 500,
                        }
                  }
                  data-testid={`picker-tier-${t}`}
                  data-selected={selected ? "true" : "false"}
                >
                  <span>{label}</span>
                  <span
                    className="text-[9px]"
                    style={{
                      opacity: selected ? 0.85 : 0.7,
                      color: selected
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {available.length === 0 && (
          <div
            className="py-8 text-center text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            All indicators already added.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {available.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id, tier)}
              className="text-left rounded-lg p-4 flex flex-col gap-1 transition-colors hover:border-(--border-strong)"
              style={{
                backgroundColor: "var(--bg-card-raised)",
                border: "1px solid var(--border)",
              }}
              data-testid="picker-option"
              data-indicator-id={m.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.label}</span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {m.abbreviation}
                </span>
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
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
