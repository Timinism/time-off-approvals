export const DEFAULT_TIMEZONE = "America/Chicago";

export function todayISO(timeZone = DEFAULT_TIMEZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end && dates.length < 400) {
    dates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return dates;
}

export function isWeekday(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

export function weekdayCount(start: string, end: string): number {
  return eachDate(start, end).filter(isWeekday).length;
}

export function calendarDayCount(start: string, end: string): number {
  return eachDate(start, end).length;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(iso));
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatFullDate(start);
  return `${formatFullDate(start)} – ${formatFullDate(end)}`;
}

export function formatShortRange(start: string, end: string): string {
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(utcDate(start));
  if (start === end) return startLabel;
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(utcDate(end));
  return `${startLabel} – ${endLabel}`;
}

export function spanSummary(start: string, end: string): string {
  const days = calendarDayCount(start, end);
  const weekdays = weekdayCount(start, end);
  const dayLabel = days === 1 ? "1 calendar day" : `${days} calendar days`;
  const weekdayLabel = weekdays === 1 ? "1 weekday" : `${weekdays} weekdays`;
  return `${formatRange(start, end)} · ${dayLabel} · ${weekdayLabel}`;
}

export function greeting(timeZone = DEFAULT_TIMEZONE, now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatTimestamp(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function atLocalNoon(isoDate: string): string {
  // 17:00 UTC sits inside the America/Chicago calendar day in both standard and daylight time.
  return `${isoDate}T17:00:00.000Z`;
}
