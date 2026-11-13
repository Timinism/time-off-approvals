import { PageHeader } from "@/components/page-header";
import { RequestForm } from "@/components/request-form";
import { addDaysISO, todayISO } from "@/lib/dates";
import { itopsEmail, orgTimezone } from "@/lib/config";
import { calendarIntegrationEnabled } from "@/lib/settings";
import { listVisibleRequests } from "@/lib/repo";
import { getAppUser } from "@/lib/session";
import { SICK_LOOKBACK_DAYS } from "@/lib/validate";
import type { LeaveType } from "@/lib/types";

export const metadata = { title: "New request" };

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getAppUser();
  if (!user) return null;
  const params = await searchParams;
  const defaultType: LeaveType = params.type === "sick" ? "sick" : "pto";
  const today = todayISO(orgTimezone());
  const blocked = listVisibleRequests(user.id)
    .filter(
      (request) =>
        request.requesterId === user.id &&
        (request.status === "pending" || request.status === "approved"),
    )
    .map((request) => ({
      id: request.id,
      type: request.type,
      status: request.status,
      startDate: request.startDate,
      endDate: request.endDate,
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Ask for the days">
        Pick PTO or sick time, the first and last day, and anything your manager should know. One
        request can cover up to 31 days.
      </PageHeader>
      <RequestForm
        defaultType={defaultType}
        today={today}
        sickEarliest={addDaysISO(today, -SICK_LOOKBACK_DAYS)}
        latest={addDaysISO(today, 366)}
        managerName={user.managerName}
        managerEmail={user.managerEmail}
        itopsEmail={itopsEmail()}
        calendarEnabled={calendarIntegrationEnabled()}
        blocked={blocked}
      />
    </div>
  );
}
