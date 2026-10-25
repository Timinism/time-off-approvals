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
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <CalendarDays className="size-4" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Time Off</span>
    </Link>
  );
}

function Account({ user }: { user: AppUser }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="hidden text-right xl:block">
        <p className="text-sm leading-none font-medium">{user.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{user.jobTitle || user.email}</p>
      </div>
      <span
        className="grid size-8 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
        aria-hidden
      >
        {initials(user.name)}
      </span>
      <ThemeToggle className="px-2 sm:px-2.5" />
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}

export function Shell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="hidden min-w-0 flex-1 justify-center xl:flex">
            <NavLinks managesTeam={user.managesTeam} pending={user.pendingApprovalCount} />
          </div>
          <div className="ml-auto">
            <Account user={user} />
          </div>
        </div>
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 pb-3 xl:hidden sm:px-6">
          <NavLinks managesTeam={user.managesTeam} pending={user.pendingApprovalCount} />
        </div>
      </header>
      {user.directoryError ? (
        <div className="border-b border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="mx-auto max-w-5xl px-4 py-3 text-sm text-rose-950 sm:px-6 dark:text-rose-100">
            {user.directoryError}
          </p>
        </div>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {user.source === "demo" ? (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-muted-foreground">
              <span className="mr-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Demo
              </span>
              Mail and the IT Ops invite are saved on the request. Nothing is sent until Entra ID is
              connected.
            </p>
            <form action={enterDemo} className="flex shrink-0 items-center gap-2">
              <label htmlFor="persona" className="sr-only">
                View as
              </label>
              <select
                id="persona"
                name="userId"
                defaultValue={user.id}
                className="h-9 max-w-[11rem] rounded-lg border border-border bg-background px-2 text-sm sm:max-w-none"
              >
                {DEMO_PEOPLE.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                View as
              </Button>
            </form>
          </div>
        ) : null}
        {children}
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border/70 px-4 py-6 text-xs leading-5 text-muted-foreground sm:px-6">
        Approvers come from the manager field in Microsoft Entra. Sick notes stay with you and your
        manager. The IT Ops calendar invite only includes the name, the type of leave, and the dates.
      </footer>
    </div>
  );
}
