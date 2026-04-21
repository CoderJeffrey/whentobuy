import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: Props) {
  return (
    <section
      className="rounded-2xl p-16 flex flex-col items-center justify-center gap-4 text-center"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        minHeight: "60vh",
      }}
      data-testid="coming-soon"
    >
      <div
        className="w-12 h-12 flex items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--bg-card-raised)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <Icon size={22} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
      </div>
      <h2
        className="text-xl tracking-tight"
        style={{ color: "var(--text-primary)", fontWeight: 500 }}
      >
        {title}
      </h2>
      <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      <div
        className="mt-2 text-[11px] tracking-label uppercase"
        style={{ color: "var(--text-tertiary)", fontWeight: 500 }}
      >
        Coming soon
      </div>
    </section>
  );
}
