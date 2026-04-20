import { useEffect, useMemo, useRef, useState } from "react";
import type { IndicatorId, IndicatorMeta, Tier } from "../types";

type Step = "select" | "assign";

const TIERS: { tier: Tier; label: string; sub: string }[] = [
  { tier: "high", label: "HIGH", sub: "10 pts" },
  { tier: "medium", label: "MEDIUM", sub: "5 pts" },
  { tier: "low", label: "LOW", sub: "2 pts" },
];

const TIER_RGB: Record<Tier, string> = {
  high: "166, 107, 107",
  medium: "156, 133, 71",
  low: "97, 96, 92",
};

export function IndicatorPicker({
  indicators,
  usedIds,
  onAdd,
  onClose,
}: {
  indicators: IndicatorMeta[];
  usedIds: Set<string>;
  onAdd: (ids: IndicatorId[], tier: Tier) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<IndicatorId>>(new Set());
  const [targetTier, setTargetTier] = useState<Tier | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "select") searchRef.current?.focus();
  }, [step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const available = useMemo(
    () => indicators.filter((m) => !usedIds.has(m.id)),
    [indicators, usedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((m) => {
      return (
        m.label.toLowerCase().includes(q) ||
        m.abbreviation.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [available, query]);

  function toggle(id: IndicatorId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedMetas = useMemo(
    () => indicators.filter((m) => selectedIds.has(m.id)),
    [indicators, selectedIds],
  );

  function handleAdd() {
    if (!targetTier || selectedIds.size === 0) return;
    onAdd(Array.from(selectedIds), targetTier);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: "rgba(15, 15, 14, 0.72)" }}
      onClick={onClose}
      data-testid="indicator-picker"
    >
      <div
        className="rounded-2xl w-full max-w-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
        data-step={step}
      >
        {step === "select" ? (
          <SelectStep
            searchRef={searchRef}
            query={query}
            setQuery={setQuery}
            filtered={filtered}
            selectedIds={selectedIds}
            onToggle={toggle}
            onClose={onClose}
            onContinue={() => setStep("assign")}
          />
        ) : (
          <AssignStep
            selectedMetas={selectedMetas}
            targetTier={targetTier}
            setTargetTier={setTargetTier}
            onBack={() => setStep("select")}
            onClose={onClose}
            onAdd={handleAdd}
          />
        )}
      </div>
    </div>
  );
}

function SelectStep({
  searchRef,
  query,
  setQuery,
  filtered,
  selectedIds,
  onToggle,
  onClose,
  onContinue,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  filtered: IndicatorMeta[];
  selectedIds: Set<IndicatorId>;
  onToggle: (id: IndicatorId) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const count = selectedIds.size;
  return (
    <>
      <Header title="Add indicators" onClose={onClose} />

      <div
        className="px-8 pt-4 pb-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md"
          style={{
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ color: "var(--text-tertiary)" }} aria-hidden>
            🔍
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search indicators..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-(--text-tertiary)"
            style={{ color: "var(--text-primary)" }}
            data-testid="picker-search-input"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-base leading-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-auto px-8 py-4 flex flex-col gap-2"
        data-testid="picker-list"
      >
        {filtered.length === 0 && (
          <div
            className="py-10 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
            data-testid="picker-empty"
          >
            {query
              ? `No indicators match "${query}".`
              : "All indicators already added."}
          </div>
        )}
        {filtered.map((m) => (
          <IndicatorRow
            key={m.id}
            meta={m}
            selected={selectedIds.has(m.id)}
            onToggle={() => onToggle(m.id)}
          />
        ))}
      </div>

      <FooterBar>
        <span
          className="text-xs tracking-label uppercase"
          style={{ color: "var(--text-secondary)" }}
          data-testid="picker-count"
        >
          {count === 0 ? "No indicators selected" : `${count} selected`}
        </span>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onClose} data-testid="picker-cancel">
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={onContinue}
            disabled={count === 0}
            data-testid="picker-continue"
          >
            Continue →
          </PrimaryButton>
        </div>
      </FooterBar>
    </>
  );
}

function AssignStep({
  selectedMetas,
  targetTier,
  setTargetTier,
  onBack,
  onClose,
  onAdd,
}: {
  selectedMetas: IndicatorMeta[];
  targetTier: Tier | null;
  setTargetTier: (t: Tier) => void;
  onBack: () => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <Header title="Assign tier" onClose={onClose} onBack={onBack} />

      <div
        className="px-8 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="text-xs tracking-label uppercase mb-3"
          style={{ color: "var(--text-tertiary)", fontWeight: 500 }}
        >
          {selectedMetas.length} indicator
          {selectedMetas.length === 1 ? "" : "s"} selected
        </div>
        <ul
          className="flex flex-col gap-1 max-h-32 overflow-auto text-sm"
          style={{ color: "var(--text-secondary)" }}
          data-testid="assign-summary"
        >
          {selectedMetas.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span style={{ color: "var(--text-primary)" }}>{m.label}</span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {m.abbreviation}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-8 py-6 flex-1 overflow-auto">
        <div
          className="text-xs tracking-label uppercase mb-4"
          style={{ color: "var(--text-tertiary)", fontWeight: 500 }}
        >
          Importance tier
        </div>
        <div className="grid grid-cols-3 gap-3" data-testid="tier-buttons">
          {TIERS.map(({ tier, label, sub }) => {
            const selected = tier === targetTier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setTargetTier(tier)}
                className="rounded-xl py-5 flex flex-col items-center gap-1 transition-colors"
                style={
                  selected
                    ? {
                        backgroundColor: `rgba(${TIER_RGB[tier]}, 0.9)`,
                        border: `1px solid var(--tier-${tier})`,
                        color: "var(--text-primary)",
                      }
                    : {
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }
                }
                data-testid={`tier-option-${tier}`}
                data-selected={selected ? "true" : "false"}
              >
                <span
                  className="text-sm tracking-label uppercase"
                  style={{ fontWeight: 500 }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] font-mono tracking-label uppercase"
                  style={{
                    color: selected
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    opacity: selected ? 0.85 : 1,
                  }}
                >
                  {sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <FooterBar>
        <span />
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onBack} data-testid="assign-back">
            ← Back
          </SecondaryButton>
          <PrimaryButton
            onClick={onAdd}
            disabled={targetTier === null}
            data-testid="assign-add"
          >
            Add →
          </PrimaryButton>
        </div>
      </FooterBar>
    </>
  );
}

function IndicatorRow({
  meta,
  selected,
  onToggle,
}: {
  meta: IndicatorMeta;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-left rounded-lg p-4 flex items-start gap-3 transition-colors hover:bg-(--bg-card-raised)"
      style={{
        backgroundColor: selected
          ? "var(--bg-card-raised)"
          : "var(--bg-card)",
        border: `1px solid ${selected ? "var(--border-strong)" : "var(--border)"}`,
      }}
      data-testid="picker-option"
      data-indicator-id={meta.id}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {meta.label}
          </span>
          <span
            className="text-xs font-mono shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            {meta.abbreviation}
          </span>
        </div>
        <div
          className="text-xs leading-snug"
          style={{ color: "var(--text-secondary)" }}
        >
          {meta.description}
        </div>
      </div>
      <Checkbox selected={selected} />
    </button>
  );
}

function Checkbox({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex items-center justify-center rounded-full shrink-0 transition-colors"
      style={{
        width: 20,
        height: 20,
        border: `2px solid ${selected ? "var(--accent)" : "var(--border-strong)"}`,
        backgroundColor: selected ? "var(--accent)" : "transparent",
      }}
    >
      {selected && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.5L4 7.5L8 2.5"
            stroke="var(--bg-page)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function Header({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div
      className="px-8 pt-6 pb-4 flex items-center justify-between"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-base leading-none"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Back"
          >
            ←
          </button>
        )}
        <h3
          className="text-xs tracking-label uppercase"
          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
        >
          {title}
        </h3>
      </div>
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
  );
}

function FooterBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-8 py-4 flex items-center justify-between gap-4"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-md text-sm transition-opacity"
      style={{
        backgroundColor: "var(--accent)",
        color: "var(--bg-page)",
        fontWeight: 500,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-md text-sm"
      style={{
        backgroundColor: "transparent",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
        fontWeight: 500,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
