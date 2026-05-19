import { useEffect, useRef, useState } from "react";
import type { Combo, IndicatorMeta } from "../types";

interface Props {
  meta: IndicatorMeta;
  combos: Combo[];
  maxCombos: number;
  onClose: () => void;
  onAddToCombo: (comboId: string) => void;
  onCreateCombo: () => void;
}

export function IndicatorDetailModal({
  meta,
  combos,
  maxCombos,
  onClose,
  onAddToCombo,
  onCreateCombo,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const atLimit = combos.length >= maxCombos;
  const eligibleCombos = combos.filter(
    (c) => !c.indicatorIds.includes(meta.id),
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="indicator-detail-modal"
    >
      <div
        ref={containerRef}
        className="w-full max-w-md rounded-2xl flex flex-col"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          maxHeight: "85vh",
        }}
      >
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <div
              className="text-base"
              style={{ color: "var(--text-primary)", fontWeight: 600 }}
            >
              {meta.label}
            </div>
            <div
              className="text-[11px] mt-0.5 font-mono tracking-label uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              {meta.abbreviation} · {meta.category}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-lg leading-none"
            style={{ color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-4">
          <section>
            <h4
              className="text-[10px] tracking-label uppercase mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              About
            </h4>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {meta.description}
            </p>
          </section>
        </div>

        {pickerOpen ? (
          <ComboPicker
            combos={combos}
            indicatorId={meta.id}
            onCancel={() => setPickerOpen(false)}
            onPick={(id) => {
              setPickerOpen(false);
              onAddToCombo(id);
            }}
          />
        ) : (
          <div
            className="px-5 py-4 flex items-center justify-end gap-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={eligibleCombos.length === 0}
              className="px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: "transparent",
                color:
                  eligibleCombos.length === 0
                    ? "var(--text-tertiary)"
                    : "var(--accent)",
                border: `1px solid ${
                  eligibleCombos.length === 0
                    ? "var(--border)"
                    : "var(--border-strong)"
                }`,
                fontWeight: 500,
                cursor:
                  eligibleCombos.length === 0 ? "not-allowed" : "pointer",
              }}
              title={
                eligibleCombos.length === 0
                  ? "Already in every combo"
                  : "Add to an existing combo"
              }
              data-testid="indicator-add-to-combo"
            >
              Add to Combo
            </button>
            <button
              type="button"
              onClick={onCreateCombo}
              disabled={atLimit}
              className="px-3 py-2 rounded-md text-sm"
              style={{
                backgroundColor: atLimit
                  ? "var(--bg-card-raised)"
                  : "var(--accent)",
                color: atLimit ? "var(--text-tertiary)" : "var(--bg-page)",
                fontWeight: 500,
                cursor: atLimit ? "not-allowed" : "pointer",
              }}
              title={atLimit ? `Combo limit reached (${maxCombos})` : undefined}
              data-testid="indicator-create-combo"
            >
              + Create Combo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ComboPicker({
  combos,
  indicatorId,
  onCancel,
  onPick,
}: {
  combos: Combo[];
  indicatorId: string;
  onCancel: () => void;
  onPick: (comboId: string) => void;
}) {
  return (
    <div
      className="px-5 py-4 flex flex-col gap-2"
      style={{ borderTop: "1px solid var(--border)" }}
      data-testid="combo-picker"
    >
      <div className="flex items-center justify-between">
        <h4
          className="text-[10px] tracking-label uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Pick a combo
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          Cancel
        </button>
      </div>
      {combos.length === 0 && (
        <div
          className="text-xs italic py-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          No combos yet. Create one first.
        </div>
      )}
      {combos.map((c) => {
        const has = c.indicatorIds.includes(indicatorId);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => !has && onPick(c.id)}
            disabled={has}
            className="w-full text-left px-3 py-2 rounded-md flex items-center justify-between"
            style={{
              backgroundColor: "var(--bg-card-raised)",
              border: "1px solid var(--border)",
              color: has ? "var(--text-tertiary)" : "var(--text-primary)",
              cursor: has ? "not-allowed" : "pointer",
            }}
            data-testid="combo-picker-item"
          >
            <span className="text-sm">{c.name}</span>
            <span
              className="text-[10px] tracking-label uppercase font-mono"
              style={{ color: has ? "var(--positive)" : "var(--text-tertiary)" }}
            >
              {has ? "✓ in combo" : `${c.indicatorIds.length} ind.`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
