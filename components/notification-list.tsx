import { resendNotificationAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/dates";
import type { NotificationRecord } from "@/lib/types";

const kindLabel: Record<NotificationRecord["kind"], string> = {
  request_email: "Request email",
  decision_email: "Decision email",
  cancel_email: "Cancellation email",
  calendar_invite: "Calendar invite",
};

const statusLabel: Record<NotificationRecord["status"], string> = {
  sent: "Sent",
  simulated: "Saved in demo",
  failed: "Not delivered",
};

export function NotificationList({
  notifications,
  timeZone,
  canResend,
  requestId,
}: {
  notifications: NotificationRecord[];
  timeZone: string;
  canResend: boolean;
  requestId: string;
}) {
  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing has been sent for this request yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {notifications.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{kindLabel[item.kind]}</p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(item.createdAt, timeZone)} · From {item.fromEmail} to {item.toEmail}
              </p>
            </div>
            <span
              className={
                item.status === "failed"
                  ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-950 dark:bg-rose-950/50 dark:text-rose-100"
                  : "rounded-full bg-sand px-2 py-0.5 text-xs font-medium text-foreground"
              }
            >
              {statusLabel[item.status]}
            </span>
          </div>
          <p className="mt-2 text-sm">{item.subject}</p>
          {item.detail ? <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p> : null}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-primary">Read the message</summary>
            <iframe
              title={item.subject}
              sandbox=""
              srcDoc={item.bodyHtml}
              className="mt-3 h-72 w-full rounded-lg border border-border bg-white"
            />
          </details>
          {canResend && item.status === "failed" ? (
            <form action={resendNotificationAction} className="mt-3">
              <input type="hidden" name="requestId" value={requestId} />
              <input type="hidden" name="notificationId" value={item.id} />
              <Button type="submit" variant="outline" size="sm">
                Try sending again
              </Button>
            </form>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
