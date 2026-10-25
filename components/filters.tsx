import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUSES = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["denied", "Denied"],
  ["cancelled", "Cancelled"],
] as const;

const TYPES = [
  ["all", "PTO and sick"],
  ["pto", "PTO"],
  ["sick", "Sick"],
] as const;

function hrefFor(
  base: string,
  status: string,
  type: string,
  q: string,
  next: { status?: string; type?: string },
) {
  const params = new URLSearchParams();
  const nextStatus = next.status ?? status;
  const nextType = next.type ?? type;
  if (nextStatus !== "all") params.set("status", nextStatus);
  if (nextType !== "all") params.set("type", nextType);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function RequestFilters({
  base,
  status,
  type,
  q = "",
  showSearch = false,
}: {
  base: string;
  status: string;
  type: string;
  q?: string;
  showSearch?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(([value, label]) => (
          <Link
            key={value}
            href={hrefFor(base, status, type, q, { status: value })}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              status === value ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border",
            )}
            aria-current={status === value ? "true" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([value, label]) => (
          <Link
            key={value}
            href={hrefFor(base, status, type, q, { type: value })}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              type === value ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {showSearch ? (
        <form action={base} className="flex gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            aria-label="Search by name"
            className="max-w-xs"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      ) : null}
    </div>
  );
}
