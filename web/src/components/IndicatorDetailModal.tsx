import { useEffect, useState } from "react";
import type { Combo, IndicatorMeta } from "../types";
import "./Modal.css";

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
      className="mbg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="indicator-detail-modal"
    >
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className="min-w-0">
            <div className="modal-title">{meta.label}</div>
            <div className="modal-sub">
              {meta.abbreviation} · {meta.category}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="modal-close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4 className="sec-label">About</h4>
            <p className="about-text">{meta.description}</p>
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
          <div className="modal-foot">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={eligibleCombos.length === 0}
              className="btn btn-outline"
              title={
                eligibleCombos.length === 0
                  ? "Already in every combo"
                  : "Add to an existing combo"
              }
              data-testid="indicator-add-to-combo"
            >
              ADD TO COMBO
            </button>
            <button
              type="button"
              onClick={onCreateCombo}
              disabled={atLimit}
              className="btn btn-primary"
              title={atLimit ? `Combo limit reached (${maxCombos})` : undefined}
              data-testid="indicator-create-combo"
            >
              + CREATE COMBO
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
    <div className="modal-foot" data-testid="combo-picker">
      <div style={{ width: "100%" }}>
        <div className="sec-head">
          <h4 className="sec-label">Pick a combo</h4>
          <button type="button" onClick={onCancel} className="link-btn">
            Cancel
          </button>
        </div>
        {combos.length === 0 ? (
          <div className="empty">No combos yet. Create one first.</div>
        ) : (
          <div className="rows">
            {combos.map((c) => {
              const has = c.indicatorIds.includes(indicatorId);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => !has && onPick(c.id)}
                  disabled={has}
                  className="pick-row"
                  data-testid="combo-picker-item"
                >
                  <span className="pr-main">
                    <span className="pr-name">{c.name}</span>
                  </span>
                  <span className={`pr-tag${has ? " in" : ""}`}>
                    {has ? "✓ IN COMBO" : `${c.indicatorIds.length} IND`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
