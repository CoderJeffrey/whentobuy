interface Props {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: Props) {
  return (
    <header className="py-6 flex flex-col gap-1" data-testid="page-header">
      <h1
        className="text-xl tracking-tight"
        style={{ color: "var(--text-primary)", fontWeight: 500 }}
      >
        {title}
      </h1>
      {description && (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      )}
    </header>
  );
}
