import { useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  TIMEFRAME_LABELS,
  type Combo,
  type ComboIndicatorRef,
  type IndicatorMeta,
  type Timeframe,
} from "../types";
import "./Modal.css";

interface Props {
  mode: "create" | "edit";
  initial?: Combo;
  seedIndicator?: ComboIndicatorRef;
  marketplace: IndicatorMeta[];
  onClose: () => void;
  onSave: (input: {
    name: string;
    indicators: ComboIndicatorRef[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  error?: string | null;
}

function refKey(ref: ComboIndicatorRef): string {
  return `${ref.indicatorId}:${ref.timeframe}`;
}

export function ComboEditorModal({
  mode,
  initial,
  seedIndicator,
  marketplace,
  onClose,
  onSave,
  onDelete,
  error,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(() => initial?.name ?? "");
  const [indicators, setIndicators] = useState<ComboIndicatorRef[]>(() => {
    const base = initial?.indicators ?? [];
    if (seedIndicator && !base.some((r) => refKey(r) === refKey(seedIndicator))) {
      return [...base, seedIndicator];
    }
    return base;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const metaById = useMemo(() => {
    const map = new Map<string, IndicatorMeta>();
    for (const m of marketplace) map.set(m.id, m);
    return map;
  }, [marketplace]);

  const supportedFor = (id: string): Timeframe[] =>
    metaById.get(id)?.supportedTimeframes ?? ["daily"];

  // An indicator drops out of the picker only once every timeframe it supports
  // is already in the combo.
  const fullyUsedIds = useMemo(() => {
    const used = new Map<string, Set<Timeframe>>();
    for (const r of indicators) {
      const set = used.get(r.indicatorId) ?? new Set<Timeframe>();
      set.add(r.timeframe);
      used.set(r.indicatorId, set);
    }
    const full = new Set<string>();
    for (const [id, tfs] of used) {
      if (supportedFor(id).every((tf) => tfs.has(tf))) full.add(id);
    }
    return full;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators, metaById]);

  const canSave = name.trim().length > 0 && indicators.length > 0 && !saving;

  function removeIndicator(index: number) {
    setIndicators((rows) => rows.filter((_, i) => i !== index));
  }

  function addIndicator(id: string) {
    const supported = supportedFor(id);
    const used = new Set(
      indicators.filter((r) => r.indicatorId === id).map((r) => r.timeframe),
    );
    const tf = supported.find((t) => !used.has(t));
    if (!tf) return;
    setIndicators((rows) => [...rows, { indicatorId: id, timeframe: tf }]);
    setPickerOpen(false);
  }

  function changeTimeframe(index: number, tf: Timeframe) {
    setIndicators((rows) => {
      const target = rows[index];
      if (!target) return rows;
      // Don't allow collapsing onto an existing (indicator, timeframe) pair.
      if (
        rows.some(
          (r, i) =>
            i !== index &&
            r.indicatorId === target.indicatorId &&
            r.timeframe === tf,
        )
      ) {
        return rows;
      }
      return rows.map((r, i) => (i === index ? { ...r, timeframe: tf } : r));
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), indicators });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mbg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="combo-editor"
    >
      <div className="modal modal-md">
        <div className="modal-head">
          <div className="modal-title">
            {mode === "create" ? t("comboEditor.newTitle") : t("comboEditor.editTitle")}
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
          <div className="field">
            <label className="sec-label" htmlFor="combo-name">
              {t("comboEditor.name")}
            </label>
            <input
              id="combo-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("comboEditor.namePlaceholder")}
              className="field-input"
              autoComplete="off"
              spellCheck={false}
              data-testid="combo-name-input"
            />
          </div>

          <div>
            <div className="sec-head">
              <h4 className="sec-label">
                {t("comboEditor.indicators", { count: indicators.length })}
              </h4>
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="link-btn"
                data-testid="combo-add-indicator"
              >
                {pickerOpen ? t("comboEditor.closePicker") : t("comboEditor.addIndicator")}
              </button>
            </div>

            {indicators.length === 0 && !pickerOpen && (
              <div className="empty">{t("comboEditor.emptyIndicators")}</div>
            )}

            {indicators.length > 0 && (
              <div className="rows">
                {indicators.map((ref, index) => {
                  const meta = metaById.get(ref.indicatorId);
                  const supported = supportedFor(ref.indicatorId);
                  return (
                    <div
                      key={refKey(ref)}
                      className="pick-row"
                      data-testid="combo-indicator-row"
                    >
                      <span className="pr-main">
                        <span className="pr-name">
                          {meta?.label ?? ref.indicatorId}
                        </span>
                        {meta?.abbreviation && (
                          <span className="pr-abbr">{meta.abbreviation}</span>
                        )}
                      </span>
                      <span className="pr-actions">
                        <TimeframeSelect
                          value={ref.timeframe}
                          options={supported}
                          onChange={(tf) => changeTimeframe(index, tf)}
                        />
                        <button
                          type="button"
                          onClick={() => removeIndicator(index)}
                          className="pr-remove"
                          aria-label={t("comboEditor.removeIndicator", {
                            name: meta?.label ?? ref.indicatorId,
                          })}
                        >
                          {t("common.remove")}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {pickerOpen && (
              <div style={{ marginTop: 10 }}>
                <IndicatorPickerInline
                  marketplace={marketplace}
                  excludeIds={fullyUsedIds}
                  onPick={addIndicator}
                />
              </div>
            )}
          </div>

          <div className="hint">
            <Trans i18nKey="comboEditor.hint" components={{ em: <em /> }} />
          </div>

          {error && (
            <div className="error-box" data-testid="combo-editor-error">
              {error}
            </div>
          )}
        </div>

        <div className="modal-foot split">
          <div>
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="btn-danger-text"
                data-testid="combo-editor-delete"
              >
                {t("comboEditor.deleteCombo")}
              </button>
            )}
          </div>
          <div className="foot-right">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="btn btn-primary"
              data-testid="combo-editor-save"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Themed timeframe dropdown — replaces the native <select>, whose popup ignores
 * the app's dark monochrome palette. Renders a static label when only one
 * timeframe is supported (market indicators are daily-only).
 */
function TimeframeSelect({
  value,
  options,
  onChange,
}: {
  value: Timeframe;
  options: Timeframe[];
  onChange: (tf: Timeframe) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Capture phase + stopImmediatePropagation so Escape closes the menu
        // without also closing the parent modal.
        e.stopImmediatePropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (options.length <= 1) {
    return (
      <span
        className="pr-tf-static"
        title="Market indicators are daily only"
        data-testid="combo-indicator-tf"
      >
        {TIMEFRAME_LABELS[value]}
      </span>
    );
  }

  return (
    <div className="tf-select" ref={ref}>
      <button
        type="button"
        className="tf-select-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="combo-indicator-tf"
      >
        {TIMEFRAME_LABELS[value]}
        <span className="chev" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="tf-menu" role="listbox">
          {options.map((tf) => (
            <button
              key={tf}
              type="button"
              role="option"
              aria-selected={tf === value}
              className={tf === value ? "active" : ""}
              onClick={() => {
                onChange(tf);
                setOpen(false);
              }}
              data-testid={`combo-tf-option-${tf}`}
            >
              {TIMEFRAME_LABELS[tf]}
              {tf === value && (
                <span className="tick" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IndicatorPickerInline({
  marketplace,
  excludeIds,
  onPick,
}: {
  marketplace: IndicatorMeta[];
  excludeIds: Set<string>;
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketplace
      .filter((m) => !excludeIds.has(m.id))
      .filter((m) => {
        if (!q) return true;
        return (
          m.label.toLowerCase().includes(q) ||
          m.abbreviation.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [marketplace, excludeIds, query]);

  return (
    <div className="picker" data-testid="indicator-picker-inline">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("comboEditor.searchPlaceholder")}
        className="search-input"
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && (
          <div className="empty">{t("comboEditor.noMatches")}</div>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className="pick-row"
            data-testid="indicator-picker-result"
          >
            <span className="pr-name truncate">{m.label}</span>
            <span className="pr-tag">{m.abbreviation}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
