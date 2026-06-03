import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TIMEFRAME_LABELS,
  type Combo,
  type IndicatorMeta,
  type Timeframe,
} from "../types";
import "./Modal.css";

interface Props {
  meta: IndicatorMeta;
  combos: Combo[];
  maxCombos: number;
  onClose: () => void;
  onAddToCombo: (comboId: string, timeframe: Timeframe) => void;
  onCreateCombo: (timeframe: Timeframe) => void;
}

type Step =
  | { kind: "actions" }
  | { kind: "timeframe"; action: "add" | "create" }
  | { kind: "combo"; timeframe: Timeframe };

export function IndicatorDetailModal({
  meta,
  combos,
  maxCombos,
  onClose,
  onAddToCombo,
  onCreateCombo,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ kind: "actions" });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const atLimit = combos.length >= maxCombos;
  const timeframes = meta.supportedTimeframes;
  const singleTimeframe = timeframes.length <= 1;

  // Skip the timeframe step entirely when only one timeframe is supported
  // (e.g. market indicators are daily-only).
  function startAdd() {
    if (singleTimeframe) setStep({ kind: "combo", timeframe: timeframes[0] });
    else setStep({ kind: "timeframe", action: "add" });
  }
  function startCreate() {
    if (singleTimeframe) onCreateCombo(timeframes[0]);
    else setStep({ kind: "timeframe", action: "create" });
  }

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
            aria-label={t("common.close")}
            className="modal-close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4 className="sec-label">{t("indicators.about")}</h4>
            <p className="about-text">{meta.description}</p>
          </section>
          {singleTimeframe && timeframes[0] === "daily" && (
            <p className="about-text" data-testid="daily-only-note">
              {meta.label} is daily-only.
            </p>
          )}
        </div>

        {step.kind === "timeframe" && (
          <TimeframePicker
            meta={meta}
            onCancel={() => setStep({ kind: "actions" })}
            onContinue={(tf) => {
              if (step.action === "create") onCreateCombo(tf);
              else setStep({ kind: "combo", timeframe: tf });
            }}
          />
        )}

        {step.kind === "combo" && (
          <ComboPicker
            combos={combos}
            indicatorId={meta.id}
            timeframe={step.timeframe}
            onCancel={() => setStep({ kind: "actions" })}
            onPick={(id) => onAddToCombo(id, step.timeframe)}
          />
        )}

        {step.kind === "actions" && (
          <div className="modal-foot">
            <button
              type="button"
              onClick={startAdd}
              disabled={combos.length === 0}
              className="btn btn-outline"
              title={
                combos.length === 0
                  ? t("indicators.noCombosFirst")
                  : t("indicators.addToExisting")
              }
              data-testid="indicator-add-to-combo"
            >
              {t("indicators.addToCombo")}
            </button>
            <button
              type="button"
              onClick={startCreate}
              disabled={atLimit}
              className="btn btn-primary"
              title={atLimit ? t("combos.limitReached", { max: maxCombos }) : undefined}
              data-testid="indicator-create-combo"
            >
              {t("indicators.createCombo")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeframePicker({
  meta,
  onCancel,
  onContinue,
}: {
  meta: IndicatorMeta;
  onCancel: () => void;
  onContinue: (timeframe: Timeframe) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Timeframe>(
    meta.supportedTimeframes[0],
  );
  return (
    <div className="modal-foot" data-testid="timeframe-picker">
      <div style={{ width: "100%" }}>
        <div className="sec-head">
          <h4 className="sec-label">Choose timeframe for {meta.label}</h4>
          <button type="button" onClick={onCancel} className="link-btn">
            {t("common.cancel")}
          </button>
        </div>
        <div className="rows">
          {meta.supportedTimeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setSelected(tf)}
              className="pick-row"
              data-testid={`timeframe-option-${tf}`}
              aria-pressed={selected === tf}
            >
              <span className="pr-main">
                <span className="pr-name">{TIMEFRAME_LABELS[tf]}</span>
              </span>
              <span className={`pr-tag${selected === tf ? " in" : ""}`}>
                {selected === tf ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button
            type="button"
            onClick={() => onContinue(selected)}
            className="btn btn-primary"
            data-testid="timeframe-continue"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

function ComboPicker({
  combos,
  indicatorId,
  timeframe,
  onCancel,
  onPick,
}: {
  combos: Combo[];
  indicatorId: string;
  timeframe: Timeframe;
  onCancel: () => void;
  onPick: (comboId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="modal-foot" data-testid="combo-picker">
      <div style={{ width: "100%" }}>
        <div className="sec-head">
          <h4 className="sec-label">
            {t("indicators.pickCombo")} · {TIMEFRAME_LABELS[timeframe]}
          </h4>
          <button type="button" onClick={onCancel} className="link-btn">
            {t("common.cancel")}
          </button>
        </div>
        {combos.length === 0 ? (
          <div className="empty">{t("indicators.noCombosFirst")}</div>
        ) : (
          <div className="rows">
            {combos.map((c) => {
              const has = c.indicators.some(
                (ci) =>
                  ci.indicatorId === indicatorId && ci.timeframe === timeframe,
              );
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
                    {has
                      ? t("indicators.inCombo")
                      : t("indicators.indCount", { count: c.indicators.length })}
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
