import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { enterDemo, signOutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
import { DEMO_PEOPLE } from "@/lib/demo-people";
import { initials } from "@/lib/text";
import type { AppUser } from "@/lib/types";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_color-mix(in_oklch,var(--primary),transparent_55%)]">
        <CalendarDays className="size-4" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Time Off</span>
    </Link>
  );
}

export function Shell({
  user,
  calendarEnabled,
  children,
}: {
  user: AppUser;
  calendarEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border/80 bg-sidebar/80 px-3 py-4 backdrop-blur-xl lg:flex">
        <Wordmark />
        <div className="mt-6">
          <NavLinks layout="rail" managesTeam={user.managesTeam} pending={user.pendingApprovalCount} />
        </div>
        <div className="mt-auto space-y-3 border-t border-border/80 pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.jobTitle || user.email}</span>
            </span>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <div className="lg:hidden">
              <Wordmark />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="px-2 sm:px-2.5" />
              <form action={signOutAction} className="lg:hidden">
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <div className="px-3 pb-3 lg:hidden">
            <NavLinks managesTeam={user.managesTeam} pending={user.pendingApprovalCount} />
          </div>
        </header>

        {user.directoryError ? (
          <div className="border-b border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
            <p className="px-4 py-3 text-sm text-rose-950 sm:px-6 dark:text-rose-100">{user.directoryError}</p>
          </div>
        ) : null}

        <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          {user.source === "demo" ? (
            <div className="glass mb-6 flex flex-col gap-3 rounded-2xl border border-border/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <p className="text-sm text-muted-foreground">
                <span className="mr-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Demo
                </span>
                {calendarEnabled
                  ? "Mail and the IT Ops invite are saved on the request. Nothing is sent until Entra ID is connected."
                  : "Mail is saved on the request. Calendar invites are off. Nothing is sent until Entra ID is connected."}
              </p>
              <form action={enterDemo} className="flex items-center gap-2">
                <label htmlFor="persona" className="sr-only">
                  View as
                </label>
                <select
                  id="persona"
                  name="userId"
                  defaultValue={user.id}
                  className="h-9 rounded-full border border-border bg-background/80 px-3 text-sm"
                >
                  {DEMO_PEOPLE.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline" className="rounded-full">
                  View as
                </Button>
              </form>
            </div>
          ) : null}
          {children}
        </main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs leading-5 text-muted-foreground sm:px-6">
          Approvers come from the manager field in Microsoft Entra. Sick notes stay with you and your
          manager.
          {calendarEnabled
            ? " The IT Ops calendar invite only includes the name, the type of leave, and the dates."
            : " Calendar invites stay off until a manager turns them on."}
        </footer>
      </div>
    </div>
  );
}
