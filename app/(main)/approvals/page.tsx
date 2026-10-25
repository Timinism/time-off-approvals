import Link from "next/link";
import { redirect } from "next/navigation";
import { approveNow } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { RequestCard } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { itopsEmail } from "@/lib/config";
import { formatShortRange } from "@/lib/dates";
import { listPendingForApprover, listRecentDecisions } from "@/lib/repo";
import { getAppUser } from "@/lib/session";
import { typeLabel } from "@/lib/text";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAppUser();
  if (!user) return null;
  if (!user.managesTeam) redirect("/");
  const query = await searchParams;
  const waiting = listPendingForApprover(user.id);
  const recent = listRecentDecisions(user.id);

  return (
    <div className="space-y-8">
      <PageHeader title="Approvals">
        These are waiting on you because you are the manager in Microsoft Entra. Approving emails
        the person back and sends {itopsEmail()} an all-day calendar invite.
      </PageHeader>
      {query.error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
          {query.error}
        </p>
      ) : null}
      {waiting.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you"
          body="When a direct report asks for PTO or sick time, it shows up here."
        />
      ) : (
        <ul className="space-y-3">
          {waiting.map((request) => (
            <li
              key={request.id}
              className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{request.requesterName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {typeLabel(request.type)} · {formatShortRange(request.startDate, request.endDate)}
                  </p>
                  {request.notes ? (
                    <p className="mt-2 max-w-xl text-sm text-foreground/80">{request.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveNow}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit">Approve</Button>
                  </form>
                  <Button variant="outline" nativeButton={false} render={<Link href={`/requests/${request.id}`} />}>
                    Review
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recently decided</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Decisions you make will stay in this list.</p>
        ) : (
          <div className="grid gap-3">
            {recent.map((request) => (
              <RequestCard key={request.id} request={request} showRequester />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
