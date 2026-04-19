import type { Tier } from "../types";

const TIER_RGB: Record<Tier, string> = {
  high: "166, 107, 107",
  medium: "156, 133, 71",
  low: "97, 96, 92",
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

  const bg = triggered ? "var(--bg-card-raised)" : "var(--bg-card)";
  const border = triggered
    ? `rgba(${TIER_RGB[tier]}, 0.4)`
    : "var(--border)";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 relative transition-colors"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
      }}
      data-testid="indicator-card"
      data-indicator-id={id}
      data-triggered={triggered ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="flex items-center gap-2 shrink-0">
          {triggered && (
            <span
              className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: "var(--positive)",
                border: "1px solid rgba(122, 154, 125, 0.3)",
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
            style={{ color: "var(--text-tertiary)" }}
            data-testid="indicator-remove"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="text-[11px] font-mono tracking-label uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {abbreviation} · {category.replace("_", " ")}
      </div>

      <div
        className="text-xs leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        {triggered ? displayValue : description}
      </div>

      {pendingRemove && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 p-4"
          style={{
            backgroundColor: "rgba(15, 15, 14, 0.94)",
            border: "1px solid var(--border-strong)",
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
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              data-testid="indicator-remove-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmRemove}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{
                backgroundColor: "var(--negative)",
                color: "var(--text-primary)",
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
