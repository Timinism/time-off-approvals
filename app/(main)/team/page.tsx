import { EmptyState } from "@/components/empty-state";
import { RequestFilters } from "@/components/filters";
import { RequestCard } from "@/components/request-card";
import { itopsEmail } from "@/lib/config";
import { formatShortRange } from "@/lib/dates";
import { listVisibleRequests } from "@/lib/repo";
import { getAppUser } from "@/lib/session";
import { typeLabel } from "@/lib/text";
import { applyFilters, homeFeed, readFilters } from "@/lib/view";
import { redirect } from "next/navigation";

export const metadata = { title: "Team history" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const user = await getAppUser();
  if (!user) return null;
  if (!user.managesTeam) redirect("/");
  const filters = readFilters(await searchParams);
  const feed = homeFeed(user);
  const history = applyFilters(
    listVisibleRequests(user.id).filter((request) => request.requesterId !== user.id),
    filters,
  );
  const direct = feed.edges.filter((edge) => edge.managerId === user.id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Review</p>
        <h1 className="mt-2 text-4xl tracking-tight">Team history</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Your direct reports, plus the people under supervisors who report to you. You decide the
          requests that name you as approver. The rest stay with their own manager. Approved days
          also go to {itopsEmail()} as an all-day invite.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl">Who reports where</h2>
        {direct.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Directory sync has not listed direct reports yet. Requests that name you as approver
            still show below.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {direct.map((report) => {
              const kids = feed.edges.filter((edge) => edge.managerId === report.id);
              return (
                <li key={report.id}>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {report.jobTitle ? `${report.jobTitle} · ` : ""}
                    Reports to you
                  </p>
                  {kids.length > 0 ? (
                    <ul className="mt-2 space-y-2 border-l border-border pl-4">
                      {kids.map((kid) => (
                        <li key={kid.id}>
                          <p className="text-sm font-medium">{kid.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {kid.jobTitle ? `${kid.jobTitle} · ` : ""}
                            Reports to {report.name}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {feed.teamUpcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-2xl">Still out, or coming up</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {feed.teamUpcoming.map((request) => (
              <li key={request.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{request.requesterName}</span>
                <span className="text-muted-foreground">
                  {typeLabel(request.type)} · {formatShortRange(request.startDate, request.endDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-2xl">All requests under you</h2>
        <RequestFilters
          base="/team"
          status={filters.status}
          type={filters.type}
          q={filters.q}
          showSearch
        />
        {history.length === 0 ? (
          <EmptyState
            title="No requests match"
            body="Try another status, or clear the name search. New requests appear here as soon as someone on the team files one."
          />
        ) : (
          <div className="grid gap-3">
            {history.map((request) => (
              <RequestCard key={request.id} request={request} showRequester />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
