import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { enterDemo, microsoftSignIn } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { entraConfigured } from "@/lib/auth";
import { demoAllowed, entraSettings } from "@/lib/config";
import { DEMO_PEOPLE, demoManager } from "@/lib/demo-people";
import { getAppUser } from "@/lib/session";
import { safeCallback } from "@/lib/text";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);
  const user = await getAppUser();
  if (user) redirect(callbackUrl);
  const settings = entraSettings();
  const showDemo = demoAllowed();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="bg-[#0e3f3b] px-6 py-10 text-[#f6f1e7] sm:px-10 lg:px-14 lg:py-16">
        <div className="mx-auto flex h-full max-w-xl flex-col">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#f6f1e7] text-[#0e3f3b]">
              <CalendarDays className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-2xl leading-none">Time Off</p>
              <p className="mt-1 text-[11px] tracking-[0.16em] uppercase text-[#d7ebe6]">TTEC Digital</p>
            </div>
          </div>
          <div className="mt-16">
            <h1 className="text-4xl tracking-tight text-balance sm:text-5xl">
              Ask for the days. Your Entra manager gets the decision.
            </h1>
            <ol className="mt-8 space-y-4 text-sm leading-6 text-[#e7f3ef]">
              <li>1. You choose PTO or sick time, the dates, and a note.</li>
              <li>2. The manager on your Entra profile gets an email and the request in this app.</li>
              <li>3. When they approve, you get an email and IT Ops gets an all-day calendar invite.</li>
            </ol>
          </div>
          <p className="mt-auto pt-16 text-sm text-[#d7ebe6]">
            Sick notes stay with you and your manager. The invite to itops@ttecdigital.com only
            carries your name, the type of leave, and the dates.
          </p>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-10 lg:px-12 lg:py-16">
        <div className="mx-auto flex max-w-md flex-col gap-8">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div>
            <h2 className="text-3xl">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the Microsoft 365 account your team already has. The approver is whoever Entra
              lists as your manager.
            </p>
          </div>

          {params.error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
              {params.error}
            </p>
          ) : null}

          {entraConfigured ? (
            <form action={microsoftSignIn}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" className="h-11 w-full bg-white text-stone-900 ring-1 ring-border hover:bg-sand">
                <MicrosoftMark />
                Sign in with Microsoft
              </Button>
            </form>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-medium">Microsoft sign-in is not connected yet.</p>
              <p className="mt-2 text-muted-foreground">
                Add the Entra app registration, then restart. Missing: {settings.missing.join(", ")}.
              </p>
              <Link href="/setup" className="mt-3 inline-block font-medium text-primary">
                Setup steps
              </Link>
            </div>
          )}

          {showDemo ? (
            <div>
              <h3 className="text-xl">Preview with a sample team</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                These people are not in your real directory. Use them to walk a request from an
                employee to a manager, including the team under a supervisor.
              </p>
              <form action={enterDemo} className="mt-4 space-y-3">
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                {DEMO_PEOPLE.map((person) => {
                  const manager = demoManager(person);
                  return (
                    <button
                      key={person.id}
                      type="submit"
                      name="userId"
                      value={person.id}
                      className="block w-full rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary/40"
                    >
                      <span className="block font-medium">{person.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {person.jobTitle}
                        {manager ? ` · Reports to ${manager.name}` : " · Director"}
                      </span>
                      <span className="mt-2 block text-sm text-foreground/80">{person.hint}</span>
                    </button>
                  );
                })}
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="0" y="0" width="7" height="7" fill="#f25022" />
      <rect x="9" y="0" width="7" height="7" fill="#7fba00" />
      <rect x="0" y="9" width="7" height="7" fill="#00a4ef" />
      <rect x="9" y="9" width="7" height="7" fill="#ffb900" />
    </svg>
  );
}
