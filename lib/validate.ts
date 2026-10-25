import { addDaysISO, calendarDayCount, isIsoDate, rangesOverlap } from "./dates";
import type { BlockedRange, LeaveType } from "./types";

export const MAX_SPAN_DAYS = 31;
export const SICK_LOOKBACK_DAYS = 14;

export type RequestDraft = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes: string;
};

export function validateDraft(
  input: { type: string; startDate: string; endDate: string; notes: string },
  today: string,
): { ok: true; value: RequestDraft } | { ok: false; error: string } {
  if (input.type !== "pto" && input.type !== "sick") {
    return { ok: false, error: "Choose PTO or sick time." };
  }
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate)) {
    return { ok: false, error: "Choose a real first day and last day." };
  }
  if (input.endDate < input.startDate) {
    return { ok: false, error: "The last day has to be the same day as the first day, or after it." };
  }
  const span = calendarDayCount(input.startDate, input.endDate);
  if (span > MAX_SPAN_DAYS) {
    return {
      ok: false,
      error: `Request ${MAX_SPAN_DAYS} days or fewer at a time. File another request if you need longer.`,
    };
  }
  if (input.type === "pto" && input.startDate < today) {
    return {
      ok: false,
      error: "Paid time off needs to start today or in the future. Sick time can be reported up to 14 days back.",
    };
  }
  const earliestSick = addDaysISO(today, -SICK_LOOKBACK_DAYS);
  if (input.type === "sick" && input.startDate < earliestSick) {
    return {
      ok: false,
      error: "Sick time can start today or up to 14 days ago. For anything older, talk to your manager.",
    };
  }
  const notes = input.notes.replace(/\r\n/g, "\n").trim();
  if (notes.length > 2000) {
    return { ok: false, error: "Keep the note under 2,000 characters." };
  }
  return {
    ok: true,
    value: { type: input.type, startDate: input.startDate, endDate: input.endDate, notes },
  };
}

export function findBlockedOverlap(
  draft: { startDate: string; endDate: string },
  blocked: BlockedRange[],
): BlockedRange | null {
  return (
    blocked.find((range) =>
      rangesOverlap(draft.startDate, draft.endDate, range.startDate, range.endDate),
    ) ?? null
  );
}
