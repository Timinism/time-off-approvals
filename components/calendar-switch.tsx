import { setCalendarAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { itopsEmail } from "@/lib/config";

export function CalendarSwitch({ enabled, returnTo }: { enabled: boolean; returnTo: string }) {
  const ops = itopsEmail();
  return (
    <section className="glass rounded-2xl border border-border/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Optional</p>
          <h2 className="mt-1 text-base font-semibold">IT Ops calendar</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {enabled
              ? `On. An approval sends ${ops} an all-day invite with the name, the type of leave, and the dates. Notes stay in the email to the manager.`
              : "Off. Requests, approvals, and the history stay in this app. Nobody gets a calendar invite."}
          </p>
        </div>
        <form action={setCalendarAction}>
          <input type="hidden" name="enabled" value={enabled ? "off" : "on"} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant={enabled ? "outline" : "default"}>
            {enabled ? "Turn off" : "Turn on"}
          </Button>
        </form>
      </div>
    </section>
  );
}
