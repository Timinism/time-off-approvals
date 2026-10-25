import { addDaysISO, spanSummary } from "./dates";
import { graphTimeZone, itopsEmail } from "./config";
import { escapeHtml, textToHtml, typeLabel, typeLong } from "./text";
import type { LeaveType, TimeOffRequest } from "./types";

type MailInput = {
  requesterName: string;
  requesterEmail: string;
  approverName: string;
  approverEmail: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes: string;
  requestUrl: string;
  decisionNote?: string | null;
};

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#fffdf8;border:1px solid #e4dccb;border-radius:12px;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:Calibri,'Segoe UI',Arial,sans-serif;">
              <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f5c56;font-weight:bold;">Time Off · TTEC Digital</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#1e1a16;font-family:Georgia,'Times New Roman',serif;font-weight:normal;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.5;color:#3c342c;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function facts(rows: Array<[string, string]>): string {
  const rendered = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:8px 12px 8px 0;color:#6d645b;vertical-align:top;width:120px;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;color:#1e1a16;font-weight:bold;">${value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #eadfce;border-bottom:1px solid #eadfce;">${rendered}</table>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#0f5c56;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">${escapeHtml(label)}</a>
  </p>`;
}

function dateValue(start: string, end: string): string {
  return escapeHtml(spanSummary(start, end));
}

export function requestEmail(input: MailInput): { subject: string; html: string } {
  const label = typeLabel(input.type);
  const subject = `Time off request: ${input.requesterName}, ${label}, ${spanSummary(input.startDate, input.endDate).split(" · ")[0]}`;
  const note = input.notes
    ? `<p style="margin:0 0 8px;"><strong>Note from ${escapeHtml(input.requesterName)}</strong></p><p style="margin:0;">${textToHtml(input.notes)}</p>`
    : `<p style="margin:0;">No note was added.</p>`;
  const html = shell(
    `${input.requesterName} requested ${typeLong(input.type).toLowerCase()}`,
    `<p style="margin:0 0 12px;">${escapeHtml(input.approverName)}, this is waiting on you because you are ${escapeHtml(input.requesterName)}'s manager in Microsoft Entra.</p>
    ${facts([
      ["Type", escapeHtml(typeLong(input.type))],
      ["When", dateValue(input.startDate, input.endDate)],
      ["From", escapeHtml(`${input.requesterName} · ${input.requesterEmail}`)],
    ])}
    ${note}
    ${button(input.requestUrl, "Review request")}`,
  );
  return { subject, html };
}

export function decisionEmail(input: MailInput & { approved: boolean }): { subject: string; html: string } {
  const label = typeLabel(input.type);
  const when = spanSummary(input.startDate, input.endDate).split(" · ")[0];
  const subject = input.approved
    ? `Time off approved: ${label}, ${when}`
    : `Time off denied: ${label}, ${when}`;
  const lead = input.approved
    ? `${escapeHtml(input.approverName)} approved your ${escapeHtml(typeLong(input.type).toLowerCase())}. IT Ops will get an all-day calendar invite for these dates.`
    : `${escapeHtml(input.approverName)} denied your ${escapeHtml(typeLong(input.type).toLowerCase())}.`;
  const note = input.decisionNote
    ? `<p style="margin:0 0 8px;"><strong>Note from ${escapeHtml(input.approverName)}</strong></p><p style="margin:0;">${textToHtml(input.decisionNote)}</p>`
    : "";
  const html = shell(
    input.approved ? "Your time off was approved" : "Your time off was denied",
    `<p style="margin:0 0 12px;">${lead}</p>
    ${facts([
      ["Type", escapeHtml(typeLong(input.type))],
      ["When", dateValue(input.startDate, input.endDate)],
      ["Approver", escapeHtml(input.approverName)],
    ])}
    ${note}
    ${button(input.requestUrl, "View request")}`,
  );
  return { subject, html };
}

export function cancelEmail(input: MailInput): { subject: string; html: string } {
  const when = spanSummary(input.startDate, input.endDate).split(" · ")[0];
  const subject = `Time off cancelled: ${input.requesterName}, ${typeLabel(input.type)}, ${when}`;
  const html = shell(
    `${input.requesterName} cancelled a request`,
    `<p style="margin:0 0 12px;">${escapeHtml(input.approverName)}, you don't need to act on this. ${escapeHtml(input.requesterName)} cancelled it while it was still pending.</p>
    ${facts([
      ["Type", escapeHtml(typeLong(input.type))],
      ["When", dateValue(input.startDate, input.endDate)],
    ])}
    ${button(input.requestUrl, "View request")}`,
  );
  return { subject, html };
}

export type CalendarEventPayload = {
  subject: string;
  body: { contentType: "HTML"; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: true;
  showAs: "oof" | "free";
  isReminderOn: false;
  responseRequested: true;
  allowNewTimeProposals: false;
  attendees: Array<{ emailAddress: { address: string; name: string }; type: "required" }>;
};

export function calendarInvite(
  request: Pick<
    TimeOffRequest,
    "requesterName" | "requesterEmail" | "approverName" | "type" | "startDate" | "endDate"
  >,
  options: { showAs?: "oof" | "free"; organizerName?: string } = {},
): { subject: string; html: string; event: CalendarEventPayload } {
  const shortType = request.type === "pto" ? "PTO" : "Sick";
  const subject = `OOO: ${request.requesterName} (${shortType})`;
  const ops = itopsEmail();
  const endExclusive = addDaysISO(request.endDate, 1);
  const showAs = options.showAs ?? "oof";
  const organizerLine = options.organizerName
    ? `<p style="margin:12px 0 0;">Sent from ${escapeHtml(options.organizerName)}'s calendar because ${escapeHtml(request.requesterName)}'s Microsoft session was not available. ${escapeHtml(options.organizerName)} is not marked out of office.</p>`
    : "";
  const html = shell(
    subject,
    `<p style="margin:0 0 12px;"><strong>${escapeHtml(request.requesterName)}</strong> (${escapeHtml(request.requesterEmail)}) will be out of office.</p>
    ${facts([
      ["Type", escapeHtml(typeLong(request.type))],
      ["When", dateValue(request.startDate, request.endDate)],
      ["Approved by", escapeHtml(request.approverName)],
    ])}
    <p style="margin:0;">This is an all-day hold. ${escapeHtml(ops)} is invited. Personal notes from the request are not included.</p>
    ${organizerLine}`,
  );
  const event: CalendarEventPayload = {
    subject,
    body: { contentType: "HTML", content: html },
    start: { dateTime: `${request.startDate}T00:00:00`, timeZone: graphTimeZone() },
    end: { dateTime: `${endExclusive}T00:00:00`, timeZone: graphTimeZone() },
    isAllDay: true,
    showAs,
    isReminderOn: false,
    responseRequested: true,
    allowNewTimeProposals: false,
    attendees: [
      {
        emailAddress: { address: itopsEmail(), name: "IT Ops" },
        type: "required",
      },
    ],
  };
  return { subject, html, event };
}
