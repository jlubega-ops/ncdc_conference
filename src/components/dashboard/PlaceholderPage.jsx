export function PlaceholderPage({ title, description }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
      <p className="mt-6 rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
        This section is under development.
      </p>
    </div>
  );
}
