import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { addDaysISO, calendarDayCount, spanSummary, weekdayCount } from "../lib/dates";
import { decryptSecret, encryptSecret, openValue, sealValue } from "../lib/crypto";
import { calendarInvite, requestEmail } from "../lib/messages";
import { canViewRequest } from "../lib/permissions";
import type { AppUser } from "../lib/types";
import { validateDraft } from "../lib/validate";

process.env.AUTH_SECRET = "test-secret-value-with-enough-length";
process.env.ITOPS_EMAIL = "itops@ttecdigital.com";
process.env.ORG_GRAPH_TIMEZONE = "Central Standard Time";
process.env.TIMEOFF_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "timeoff-")), "timeoff.db");

test("date span counts a Friday through Monday as two weekdays", () => {
  assert.equal(calendarDayCount("2026-10-30", "2026-11-02"), 4);
  assert.equal(weekdayCount("2026-10-30", "2026-11-02"), 2);
  assert.equal(addDaysISO("2026-10-30", 3), "2026-11-02");
  assert.match(spanSummary("2026-10-26", "2026-10-26"), /1 calendar day/);
});

test("validation blocks past PTO, old sick time, and long spans", () => {
  const today = "2026-10-25";
  assert.equal(validateDraft({ type: "pto", startDate: "2026-10-24", endDate: "2026-10-24", notes: "" }, today).ok, false);
  assert.equal(validateDraft({ type: "sick", startDate: "2026-10-20", endDate: "2026-10-20", notes: "" }, today).ok, true);
  assert.equal(validateDraft({ type: "sick", startDate: "2026-10-01", endDate: "2026-10-01", notes: "" }, today).ok, false);
  assert.equal(
    validateDraft({ type: "pto", startDate: "2026-11-01", endDate: "2026-12-15", notes: "" }, today).ok,
    false,
  );
  const backwards = validateDraft(
    { type: "pto", startDate: "2026-11-05", endDate: "2026-11-01", notes: "" },
    today,
  );
  assert.equal(backwards.ok, false);
});

test("request email escapes notes and the calendar invite leaves them out", () => {
  const mail = requestEmail({
    requesterName: "Jordan Lee",
    requesterEmail: "jordan.lee@ttecdigital.com",
    approverName: "Alex Morgan",
    approverEmail: "alex.morgan@ttecdigital.com",
    type: "sick",
    startDate: "2026-10-26",
    endDate: "2026-10-26",
    notes: "Fever <script>alert(1)</script>",
    requestUrl: "http://localhost:4748/requests/abc",
  });
  assert.match(mail.subject, /Jordan Lee/);
  assert.match(mail.html, /Fever &lt;script&gt;/);
  assert.equal(mail.html.includes("<script>"), false);

  const invite = calendarInvite({
    requesterName: "Jordan Lee",
    requesterEmail: "jordan.lee@ttecdigital.com",
    approverName: "Alex Morgan",
    type: "sick",
    startDate: "2026-10-26",
    endDate: "2026-10-28",
  });
  assert.equal(invite.event.isAllDay, true);
  assert.equal(invite.event.showAs, "oof");
  assert.equal(invite.event.start.dateTime, "2026-10-26T00:00:00");
  assert.equal(invite.event.end.dateTime, "2026-10-29T00:00:00");
  assert.equal(invite.event.start.timeZone, "Central Standard Time");
  assert.equal(invite.event.attendees[0]?.emailAddress.address, "itops@ttecdigital.com");
  assert.equal(/fever/i.test(invite.html), false);
  assert.equal(invite.html.includes("Door County"), false);
});

test("signed cookies and stored tokens do not accept tampering", () => {
  const secret = "test-secret-value-with-enough-length";
  const sealed = sealValue("demo-alex", secret);
  assert.equal(openValue(sealed, secret), "demo-alex");
  assert.equal(openValue(`${sealed}x`, secret), null);
  assert.equal(openValue("demo-sam.not-a-real-mac", secret), null);
  const encrypted = encryptSecret("refresh-token", secret);
  assert.equal(decryptSecret(encrypted, secret), "refresh-token");
  assert.throws(() => decryptSecret(`${encrypted}aa`, secret));
});

test("a manager can review a supervisor's team without becoming their approver", () => {
  assert.equal(
    canViewRequest("demo-alex", { requesterId: "demo-casey", approverId: "demo-sam" }, ["demo-jordan", "demo-sam", "demo-riley", "demo-casey"]),
    true,
  );
  assert.equal(
    canViewRequest("demo-jordan", { requesterId: "demo-casey", approverId: "demo-sam" }, []),
    false,
  );
  assert.equal(canViewRequest("demo-casey", { requesterId: "demo-casey", approverId: "demo-sam" }, []), true);
});

test("the sample directory tracks the decision, and the calendar invite waits until it is turned on", async () => {
  const { seedDemo } = await import("../lib/demo-seed");
  const { descendantIds, getPerson, getRequest, listDirectReports, listNotifications } = await import(
    "../lib/repo"
  );
  const { decideTimeOff, submitTimeOff, cancelTimeOff } = await import("../lib/service");
  const { todayISO } = await import("../lib/dates");

  seedDemo();
  const actor = (id: string) => {
    const person = getPerson(id);
    assert.ok(person);
    const directReports = listDirectReports(id);
    return {
      id: person.id,
      email: person.email,
      name: person.name,
      jobTitle: person.jobTitle,
      department: person.department,
      managerId: person.managerId,
      managerName: person.managerName,
      managerEmail: person.managerEmail,
      isDemo: true,
      directoryError: null,
      directReports,
      pendingApprovalCount: 0,
      managesTeam: directReports.length > 0,
      source: "demo" as const,
    } satisfies AppUser;
  };

  const alex = actor("demo-alex");
  const jordan = actor("demo-jordan");
  const sam = actor("demo-sam");
  const sick = getRequest("demo-req-jordan-sick");
  const casey = getRequest("demo-req-casey-pto");
  assert.ok(sick && casey);
  assert.equal(sick.approverId, alex.id);
  assert.equal(casey.approverId, sam.id);
  assert.equal(canViewRequest(alex.id, casey, descendantIds(alex.id)), true);
  assert.equal(canViewRequest(jordan.id, casey, descendantIds(jordan.id)), false);

  const originalMail = listNotifications(sick.id).find((item) => item.kind === "request_email");
  assert.ok(originalMail);
  assert.match(originalMail.bodyHtml, /fever/i);

  await decideTimeOff(alex, sick.id, "approved", "Rest up");
  const approved = getRequest(sick.id);
  assert.equal(approved?.status, "approved");
  const decision = listNotifications(sick.id).find((item) => item.kind === "decision_email");
  assert.equal(
    listNotifications(sick.id).some((item) => item.kind === "calendar_invite"),
    false,
  );
  assert.equal(decision?.status, "simulated");
  assert.equal(/IT Ops/i.test(decision?.bodyHtml ?? ""), false);
  assert.match(decision?.bodyHtml ?? "", /Rest up/);

  const { setCalendarIntegration } = await import("../lib/settings");
  setCalendarIntegration(true);
  const inviteStart = addDaysISO(todayISO(), 80);
  const inviteEnd = addDaysISO(inviteStart, 1);
  const invitedId = await submitTimeOff(jordan, {
    type: "pto",
    startDate: inviteStart,
    endDate: inviteEnd,
    notes: "Door County fever",
  });
  await decideTimeOff(alex, invitedId, "approved", "Enjoy");
  const calendar = listNotifications(invitedId).find((item) => item.kind === "calendar_invite");
  assert.equal(calendar?.status, "simulated");
  assert.equal(/fever/i.test(calendar?.bodyHtml ?? ""), false);
  assert.match(calendar?.bodyHtml ?? "", /itops@ttecdigital.com/);
  assert.match(listNotifications(invitedId).find((item) => item.kind === "decision_email")?.bodyHtml ?? "", /IT Ops/);

  await assert.rejects(() => decideTimeOff(jordan, casey.id, "approved", ""));
  await assert.rejects(() => decideTimeOff(sam, casey.id, "denied", "no"));
  assert.equal(getRequest(casey.id)?.status, "pending");

  const today = todayISO();
  const start = addDaysISO(today, 40);
  const end = addDaysISO(today, 41);
  const createdId = await submitTimeOff(jordan, {
    type: "pto",
    startDate: start,
    endDate: end,
    notes: "Team offsite",
  });
  const created = getRequest(createdId);
  assert.equal(created?.status, "pending");
  assert.equal(created?.approverId, alex.id);
  assert.equal(
    listNotifications(createdId).some((item) => item.kind === "request_email" && item.status === "simulated"),
    true,
  );
  await assert.rejects(() =>
    submitTimeOff(jordan, { type: "pto", startDate: start, endDate: end, notes: "Again" }),
  );
  await cancelTimeOff(jordan, createdId);
  assert.equal(getRequest(createdId)?.status, "cancelled");
  assert.equal(
    listNotifications(createdId).some((item) => item.kind === "cancel_email"),
    true,
  );
});
