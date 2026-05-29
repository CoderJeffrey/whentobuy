import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { Combo, IndicatorMeta } from "../types";
import "./Modal.css";

interface Props {
  mode: "create" | "edit";
  initial?: Combo;
  seedIndicatorId?: string;
  marketplace: IndicatorMeta[];
  onClose: () => void;
  onSave: (input: { name: string; indicatorIds: string[] }) => Promise<void>;
  onDelete?: () => Promise<void>;
  error?: string | null;
}

export function ComboEditorModal({
  mode,
  initial,
  seedIndicatorId,
  marketplace,
  onClose,
  onSave,
  onDelete,
  error,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(() => initial?.name ?? "");
  const [indicatorIds, setIndicatorIds] = useState<string[]>(() => {
    const base = initial?.indicatorIds ?? [];
    if (seedIndicatorId && !base.includes(seedIndicatorId)) {
      return [...base, seedIndicatorId];
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

  const canSave = name.trim().length > 0 && indicatorIds.length > 0 && !saving;

  function removeIndicator(id: string) {
    setIndicatorIds((ids) => ids.filter((x) => x !== id));
  }

  function addIndicator(id: string) {
    setIndicatorIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setPickerOpen(false);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), indicatorIds });
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
                {t("comboEditor.indicators", { count: indicatorIds.length })}
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

            {indicatorIds.length === 0 && !pickerOpen && (
              <div className="empty">{t("comboEditor.emptyIndicators")}</div>
            )}

            {indicatorIds.length > 0 && (
              <div className="rows">
                {indicatorIds.map((id) => {
                  const meta = metaById.get(id);
                  return (
                    <div
                      key={id}
                      className="pick-row"
                      data-testid="combo-indicator-row"
                    >
                      <span className="pr-main">
                        <span className="pr-name">{meta?.label ?? id}</span>
                        {meta?.abbreviation && (
                          <span className="pr-abbr">{meta.abbreviation}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeIndicator(id)}
                        className="pr-remove"
                        aria-label={t("comboEditor.removeIndicator", { name: meta?.label ?? id })}
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {pickerOpen && (
              <div style={{ marginTop: 10 }}>
                <IndicatorPickerInline
                  marketplace={marketplace}
                  excludeIds={new Set(indicatorIds)}
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
