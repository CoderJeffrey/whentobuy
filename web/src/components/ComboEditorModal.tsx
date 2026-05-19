import { useEffect, useMemo, useState } from "react";
import type { Combo, IndicatorMeta } from "../types";

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
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="combo-editor"
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
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
          <div
            className="text-base"
            style={{ color: "var(--text-primary)", fontWeight: 600 }}
          >
            {mode === "create" ? "New Combo" : "Edit Combo"}
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

        <div className="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10px] tracking-label uppercase"
              style={{ color: "var(--text-tertiary)" }}
              htmlFor="combo-name"
            >
              Name
            </label>
            <input
              id="combo-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oversold + Uptrend"
              className="px-3 py-2 rounded-md text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card-raised)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
              autoComplete="off"
              spellCheck={false}
              data-testid="combo-name-input"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h4
                className="text-[10px] tracking-label uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                Indicators ({indicatorIds.length})
              </h4>
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="text-xs"
                style={{ color: "var(--accent)" }}
                data-testid="combo-add-indicator"
              >
                {pickerOpen ? "Close picker" : "+ Add indicator"}
              </button>
            </div>

            {indicatorIds.length === 0 && !pickerOpen && (
              <div
                className="text-xs italic py-3 text-center rounded-md"
                style={{
                  color: "var(--text-tertiary)",
                  border: "1px dashed var(--border)",
                }}
              >
                No indicators yet. Add at least one to save.
              </div>
            )}

            <div className="flex flex-col gap-2">
              {indicatorIds.map((id) => {
                const meta = metaById.get(id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md"
                    style={{
                      backgroundColor: "var(--bg-card-raised)",
                      border: "1px solid var(--border)",
                    }}
                    data-testid="combo-indicator-row"
                  >
                    <div className="min-w-0">
                      <div
                        className="text-sm"
                        style={{ color: "var(--text-primary)", fontWeight: 500 }}
                      >
                        {meta?.label ?? id}
                      </div>
                      {meta?.abbreviation && (
                        <div
                          className="text-[10px] font-mono"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {meta.abbreviation}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIndicator(id)}
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label={`Remove ${meta?.label ?? id}`}
                    >
                      remove
                    </button>
                  </div>
                );
              })}
            </div>

            {pickerOpen && (
              <IndicatorPickerInline
                marketplace={marketplace}
                excludeIds={new Set(indicatorIds)}
                onPick={addIndicator}
              />
            )}
          </div>

          <div
            className="text-[11px] leading-relaxed px-3 py-2 rounded-md"
            style={{
              color: "var(--text-tertiary)",
              backgroundColor: "var(--bg-card-raised)",
              border: "1px solid var(--border)",
            }}
          >
            This combo is GREEN when <em>all</em> indicators above are
            triggered.
          </div>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-md"
              style={{
                color: "var(--negative)",
                border: "1px solid var(--negative)",
              }}
              data-testid="combo-editor-error"
            >
              {error}
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 flex items-center justify-between gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div>
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-xs"
                style={{ color: "var(--negative)" }}
                data-testid="combo-editor-delete"
              >
                Delete combo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md text-sm"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 rounded-md text-sm"
              style={{
                backgroundColor: canSave
                  ? "var(--accent)"
                  : "var(--bg-card-raised)",
                color: canSave ? "var(--bg-page)" : "var(--text-tertiary)",
                fontWeight: 500,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
              data-testid="combo-editor-save"
            >
              {saving ? "Saving…" : "Save"}
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
    <div
      className="flex flex-col gap-2 rounded-md p-3"
      style={{
        backgroundColor: "var(--bg-card-raised)",
        border: "1px solid var(--border-strong)",
      }}
      data-testid="indicator-picker-inline"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search indicators…"
        className="px-2 py-1.5 rounded text-sm outline-none"
        style={{
          backgroundColor: "var(--bg-card)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />
      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto tier-scroll">
        {filtered.length === 0 && (
          <div
            className="text-xs italic py-2 text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            No matches.
          </div>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className="text-left px-2 py-1.5 rounded text-sm flex items-center justify-between gap-2"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            data-testid="indicator-picker-result"
          >
            <span className="truncate">{m.label}</span>
            <span
              className="font-mono text-[10px] shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              {m.abbreviation}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
