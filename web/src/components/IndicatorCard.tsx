import type { Tier } from "../types";

const TIER_RGB: Record<Tier, string> = {
  high: "239, 68, 68",
  medium: "245, 158, 11",
  low: "156, 163, 175",
};

export interface IndicatorCardProps {
  id: string;
  label: string;
  abbreviation: string;
  category: string;
  description: string;
  displayValue: string;
  tier: Tier;
  triggered: boolean;
  points: number;
  pendingRemove?: boolean;
  onRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
}

export function IndicatorCard(props: IndicatorCardProps) {
  const {
    id,
    label,
    abbreviation,
    category,
    description,
    displayValue,
    tier,
    triggered,
    points,
    pendingRemove,
    onRemove,
    onConfirmRemove,
    onCancelRemove,
  } = props;

  const triggeredBg = triggered
    ? `rgba(${TIER_RGB[tier]}, 0.08)`
    : "var(--bg-card)";

  const triggeredBorder = triggered
    ? `rgba(${TIER_RGB[tier]}, 0.35)`
    : "var(--border)";

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1.5 relative"
      style={{
        backgroundColor: triggeredBg,
        border: `1px solid ${triggeredBorder}`,
      }}
      data-testid="indicator-card"
      data-indicator-id={id}
      data-triggered={triggered ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold leading-tight">{label}</div>
        <div className="flex items-center gap-2 shrink-0">
          {triggered && (
            <span
              className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                color: "var(--rating-strong_buy)",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
              }}
              data-testid="indicator-points-badge"
            >
              +{points}
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="text-base leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
            data-testid="indicator-remove"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="text-[11px] font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        {abbreviation} · {category.replace("_", " ")}
      </div>

      <div
        className="text-xs leading-snug"
        style={{ color: "var(--text-muted)" }}
      >
        {triggered ? displayValue : description}
      </div>

      {pendingRemove && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 p-4"
          style={{
            backgroundColor: "rgba(10,10,10,0.92)",
            border: "1px solid var(--border)",
          }}
          data-testid="indicator-remove-confirm"
        >
          <div className="text-sm text-center">Remove {label}?</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelRemove}
              className="px-3 py-1.5 rounded text-xs"
              style={{
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
              data-testid="indicator-remove-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmRemove}
              className="px-3 py-1.5 rounded text-xs font-semibold"
              style={{
                backgroundColor: "var(--rating-immediate_sell)",
                color: "#0a0a0a",
              }}
              data-testid="indicator-remove-confirm-btn"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
