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
          <h3 className="text-lg font-semibold">Add indicator</h3>
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

        <div className="mb-4">
          <div
            className="text-[10px] font-semibold tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            ADD TO SECTION
          </div>
          <div className="flex gap-2" data-testid="picker-tier-toggle">
            {TIERS.map(({ tier: t, label, sub }) => {
              const selected = t === tier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className="flex-1 px-3 py-2 rounded-md text-xs font-semibold tracking-wider flex flex-col items-center gap-0.5"
                  style={
                    selected
                      ? {
                          backgroundColor: `var(--tier-${t})`,
                          color: "#0a0a0a",
                          border: `1px solid var(--tier-${t})`,
                        }
                      : {
                          color: `var(--tier-${t})`,
                          border: `1px solid var(--tier-${t})`,
                          backgroundColor: "transparent",
                          opacity: 0.6,
                        }
                  }
                  data-testid={`picker-tier-${t}`}
                  data-selected={selected ? "true" : "false"}
                >
                  <span>{label}</span>
                  <span className="text-[9px] opacity-80">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {available.length === 0 && (
          <div
            className="py-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
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
