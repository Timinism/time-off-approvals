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
import { initials, safeCallback } from "@/lib/text";

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

  const steps = [
    "Choose PTO or sick time, the dates, and a note.",
    "The manager on your Entra profile gets the email and the request.",
    "Approval emails you back and sends IT Ops an all-day calendar invite.",
  ];

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-16 sm:gap-8 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <section className="auth-stage relative overflow-hidden rounded-3xl px-5 py-6 text-[#f4f7f6] sm:px-10 sm:py-12">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/12 text-white ring-1 ring-white/20">
              <CalendarDays className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-lg leading-none font-semibold tracking-tight">Time Off</p>
              <p className="mt-1 text-xs text-[#d5e8e4]">TTEC Digital</p>
            </div>
          </div>
          <h1 className="mt-6 max-w-md text-3xl font-semibold tracking-tight text-balance text-[#f4f7f6] sm:mt-10 sm:text-4xl">
            Ask for the days. Your Entra manager gets the decision.
          </h1>
          <ol className="mt-5 space-y-3 sm:mt-8 sm:space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-[#e7f3ef]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-semibold ring-1 ring-white/15">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-md text-sm leading-6 text-[#d5e8e4] sm:mt-10">
            Sick notes stay with you and your manager. The invite to itops@ttecdigital.com only
            carries your name, the type of leave, and the dates.
          </p>
        </section>

        <section className="mx-auto flex w-full max-w-md flex-col gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
              <Button type="submit" className="h-11 w-full bg-white text-stone-900 shadow-sm ring-1 ring-border hover:bg-sand">
                <MicrosoftMark />
                Sign in with Microsoft
              </Button>
            </form>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card p-4 text-sm shadow-sm">
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
              <h3 className="text-lg font-semibold tracking-tight">Preview with a sample team</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These people are not in your real directory. Use them to walk a request from an
                employee to a manager, including the team under a supervisor.
              </p>
              <form action={enterDemo} className="mt-4 space-y-2">
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                {DEMO_PEOPLE.map((person) => {
                  const manager = demoManager(person);
                  return (
                    <button
                      key={person.id}
                      type="submit"
                      name="userId"
                      value={person.id}
                      className="flex w-full items-start gap-3 rounded-xl border border-border/80 bg-card px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {initials(person.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{person.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {person.jobTitle}
                          {manager ? ` · Reports to ${manager.name}` : " · Director"}
                        </span>
                        <span className="mt-1.5 block text-sm leading-5 text-foreground/80">{person.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </form>
            </div>
          ) : null}
        </section>
      </div>
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
