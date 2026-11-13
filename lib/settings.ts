import { sqlGet, sqlRun } from "./db";

const CALENDAR_KEY = "calendar_integration";

export function calendarIntegrationEnabled(): boolean {
  const row = sqlGet("SELECT value FROM app_settings WHERE key = ?", [CALENDAR_KEY]);
  return row?.value === "on";
}

export function setCalendarIntegration(enabled: boolean): void {
  sqlRun(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [CALENDAR_KEY, enabled ? "on" : "off"],
  );
}
