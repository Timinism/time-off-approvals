import Link from "next/link";
import { ArrowUpRight, HeartPulse, TreePalm } from "lucide-react";
import { RequestCard } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { getAppUser } from "@/lib/session";
import { firstName } from "@/lib/text";
import { homeFeed, managerIntro } from "@/lib/view";

export default async function HomePage() {
  const user = await getAppUser();
  if (!user) return null;
  const feed = homeFeed(user);
  const supervisors = user.directReports.filter((report) =>
    feed.edges.some((edge) => edge.managerId === report.id),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {feed.hello}, {firstName(user.name)}
        </h1>
        {user.jobTitle ? <p className="mt-1 text-sm text-muted-foreground">{user.jobTitle}</p> : null}
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {managerIntro(
            user,
            supervisors.map((person) => person.name),
          )}
        </p>
      </div>

      {user.managerEmail ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/request?type=pto"
            className="group flex items-start gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-clay/12 text-clay">
              <TreePalm className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-base font-semibold">
                Paid time off
                <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" aria-hidden />
              </span>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                Vacation, personal days, and planned time away.
              </span>
            </span>
          </Link>
          <Link
            href="/request?type=sick"
            className="group flex items-start gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-lagoon/12 text-lagoon">
              <HeartPulse className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-base font-semibold">
                Sick time
                <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" aria-hidden />
              </span>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                Illness, injury, or a medical appointment. You can report it up to 14 days back.
              </span>
            </span>
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/40">
          <h2 className="text-xl font-semibold text-rose-950 dark:text-rose-100">No approver yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-rose-900 dark:text-rose-200">
            Time Off will not let you file a request until Microsoft Entra has a manager on your
            profile. Ask IT to set that field, then sign in again.
          </p>
        </section>
      )}

      {feed.waiting.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">Waiting on you</h2>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/approvals" />}>
              Approval queue
            </Button>
          </div>
          <div className="grid gap-3">
            {feed.waiting.slice(0, 3).map((request) => (
              <RequestCard key={request.id} request={request} showRequester />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your upcoming time off</h2>
          {feed.upcomingMine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing approved is still ahead of you.</p>
          ) : (
            <div className="grid gap-3">
              {feed.upcomingMine.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">{user.managesTeam ? "Team coming up" : "Recent requests"}</h2>
            {user.managesTeam ? (
              <Link href="/team" className="text-sm font-medium text-primary">
                Team history
              </Link>
            ) : (
              <Link href="/requests" className="text-sm font-medium text-primary">
                All of yours
              </Link>
            )}
          </div>
          {user.managesTeam ? (
            feed.teamUpcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved time off is coming up for the people under you.
              </p>
            ) : (
              <div className="grid gap-3">
                {feed.teamUpcoming.slice(0, 4).map((request) => (
                  <RequestCard key={request.id} request={request} showRequester />
                ))}
              </div>
            )
          ) : feed.recent.filter((request) => request.requesterId === user.id).length === 0 ? (
            <p className="text-sm text-muted-foreground">You have not requested time off yet.</p>
          ) : (
            <div className="grid gap-3">
              {feed.recent
                .filter((request) => request.requesterId === user.id)
                .map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
