import Link from "next/link";
import { StatusBadge, TypeBadge } from "@/components/status-badge";
import { formatShortRange } from "@/lib/dates";
import type { TimeOffRequest } from "@/lib/types";

export function RequestCard({
  request,
  showRequester = false,
}: {
  request: TimeOffRequest;
  showRequester?: boolean;
}) {
  return (
    <Link
      href={`/requests/${request.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {showRequester ? request.requesterName : "Your request"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatShortRange(request.startDate, request.endDate)}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <TypeBadge type={request.type} />
        {showRequester ? (
          <span className="truncate text-xs text-muted-foreground">Approver {request.approverName}</span>
        ) : (
          <span className="truncate text-xs text-muted-foreground">To {request.approverName}</span>
        )}
      </div>
      {request.notes ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{request.notes}</p>
      ) : null}
    </Link>
  );
}
