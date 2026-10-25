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
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <CalendarDays className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg leading-none">Time Off</span>
        <span className="mt-1 block text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          TTEC Digital
        </span>
      </span>
    </Link>
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
      <div className="h-1.5 bg-primary" />
      <header className="border-b border-border/80 bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Wordmark />
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.jobTitle || user.email}</p>
              </div>
              <span
                className="grid size-9 place-items-center rounded-full bg-sand text-xs font-semibold text-primary"
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
          </div>
          <NavLinks managesTeam={user.managesTeam} pending={user.pendingApprovalCount} />
        </div>
      </header>
      {user.source === "demo" ? (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              <strong>Sample directory.</strong> Mail and the IT Ops invite are saved on the request
              so you can read them. Nothing is sent through Microsoft until Entra ID is connected.
            </p>
            <form action={enterDemo} className="flex items-center gap-2">
              <label htmlFor="persona" className="sr-only">
                View as
              </label>
              <select
                id="persona"
                name="userId"
                defaultValue={user.id}
                className="h-9 rounded-lg border border-amber-300 bg-white px-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50"
              >
                {DEMO_PEOPLE.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" className="border-amber-300 bg-white dark:border-amber-700 dark:bg-transparent dark:text-amber-50">
                View as
              </Button>
            </form>
          </div>
        </div>
      ) : null}
      {user.directoryError ? (
        <div className="border-b border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="mx-auto max-w-5xl px-4 py-3 text-sm text-rose-950 sm:px-6 dark:text-rose-100">{user.directoryError}</p>
        </div>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        Approvers come from the manager field in Microsoft Entra. Sick notes stay with you and your
        manager. The IT Ops calendar invite only includes the name, the type of leave, and the dates.
      </footer>
    </div>
  );
}
