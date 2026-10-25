import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelRequest, DecisionPanel } from "@/components/decision-panel";
import { NotificationList } from "@/components/notification-list";
import { StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { itopsEmail, orgTimezone } from "@/lib/config";
import { formatTimestamp, spanSummary } from "@/lib/dates";
import { canCancelRequest, canDecideRequest, canViewRequest } from "@/lib/permissions";
import { descendantIds, getRequest, listNotifications } from "@/lib/repo";
import { getAppUser } from "@/lib/session";
import { typeLong } from "@/lib/text";

export const metadata = { title: "Request" };

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAppUser();
  if (!user) return null;
  const { id } = await params;
  const query = await searchParams;
  const request = getRequest(id);
  if (!request || !canViewRequest(user.id, request, descendantIds(user.id))) notFound();
  const notifications = listNotifications(request.id);
  const zone = orgTimezone();
  const canDecide = canDecideRequest(user.id, request);
  const canCancel = canCancelRequest(user.id, request);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 space-y-6 lg:order-1">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Request</p>
          <h1 className="mt-2 text-4xl tracking-tight">{typeLong(request.type)}</h1>
          <p className="mt-3 text-base">{spanSummary(request.startDate, request.endDate)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={request.status} />
            <TypeBadge type={request.type} />
          </div>
        </div>

        {query.error ? (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
            {query.error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Note</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">
            {request.notes || "No note was added."}
          </p>
          {request.decisionNote ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                From {request.decidedByName || request.approverName}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{request.decisionNote}</p>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl">What went out</h2>
          <NotificationList
            notifications={notifications}
            timeZone={zone}
            canResend={user.source === "entra"}
            requestId={request.id}
          />
        </section>
      </div>

      <aside className="order-1 space-y-4 lg:order-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">People</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Requested by</dt>
              <dd className="font-medium">{request.requesterName}</dd>
              <dd className="text-muted-foreground">{request.requesterEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Approver</dt>
              <dd className="font-medium">{request.approverName}</dd>
              <dd className="text-muted-foreground">{request.approverEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Filed</dt>
              <dd>{formatTimestamp(request.createdAt, zone)}</dd>
            </div>
            {request.decidedAt ? (
              <div>
                <dt className="text-muted-foreground">Decided</dt>
                <dd>
                  {formatTimestamp(request.decidedAt, zone)}
                  {request.decidedByName ? ` by ${request.decidedByName}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {canDecide ? (
          <section className="rounded-2xl border border-primary/30 bg-card p-5">
            <h2 className="text-xl">Your decision</h2>
            <div className="mt-4">
              <DecisionPanel
                requestId={request.id}
                requesterName={request.requesterName}
                itopsEmail={itopsEmail()}
              />
            </div>
          </section>
        ) : null}

        {canCancel ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl">Changed your mind?</h2>
            <div className="mt-4">
              <CancelRequest requestId={request.id} />
            </div>
          </section>
        ) : null}

        {request.status === "pending" && !canDecide && !canCancel ? (
          <p className="text-sm text-muted-foreground">
            This is waiting on {request.approverName}. You can review it, and the decision stays with
            them.
          </p>
        ) : null}

        <Button variant="outline" nativeButton={false} className="w-full" render={<Link href="/requests" />}>
          Back to requests
        </Button>
      </aside>
    </div>
  );
}
