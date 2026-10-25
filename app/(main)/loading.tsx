export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-4 w-24 rounded bg-sand" />
      <div className="h-10 w-64 rounded bg-sand" />
      <div className="h-24 rounded-2xl bg-card ring-1 ring-border" />
      <div className="h-24 rounded-2xl bg-card ring-1 ring-border" />
      <p className="text-sm text-muted-foreground">Loading time off…</p>
    </div>
  );
}
