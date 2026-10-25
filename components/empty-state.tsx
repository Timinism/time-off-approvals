import { CalendarOff } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 px-5 py-10 text-center">
      <CalendarOff className="mx-auto size-6 text-muted-foreground" aria-hidden />
      <h2 className="mt-3 text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
