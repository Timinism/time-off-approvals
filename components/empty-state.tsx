import { CalendarOff } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/70 px-5 py-12 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <CalendarOff className="size-5" aria-hidden />
      </span>
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
