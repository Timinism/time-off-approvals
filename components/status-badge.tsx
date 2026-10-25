import { Badge } from "@/components/ui/badge";
import { statusLabel, typeLabel } from "@/lib/text";
import type { LeaveType, RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<RequestStatus, string> = {
  pending: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
  approved: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100",
  denied: "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-100",
  cancelled: "border-stone-300 bg-stone-200 text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant="outline" className={cn("h-6 px-2.5", statusStyles[status])}>
      {statusLabel(status)}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: LeaveType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 px-2.5",
        type === "pto"
          ? "border-clay/30 bg-clay/10 text-clay"
          : "border-lagoon/30 bg-lagoon/10 text-lagoon",
      )}
    >
      {typeLabel(type)}
    </Badge>
  );
}
