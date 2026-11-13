import { appUrl } from "./config";
import { calendarIntegrationEnabled } from "./settings";
import { createEvent, explainGraphFailure, sendMail } from "./graph";
import { calendarInvite, cancelEmail, decisionEmail, requestEmail } from "./messages";
import { getPerson, insertNotification } from "./repo";
import { getAccessToken } from "./tokens";
import type { NotificationKind, TimeOffRequest } from "./types";

function requestUrl(id: string): string {
  return appUrl(`/requests/${id}`);
}

function mailFields(request: TimeOffRequest) {
  return {
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    approverName: request.approverName,
    approverEmail: request.approverEmail,
    type: request.type,
    startDate: request.startDate,
    endDate: request.endDate,
    notes: request.notes,
    requestUrl: requestUrl(request.id),
    decisionNote: request.decisionNote,
  };
}

async function deliverEmail(input: {
  request: TimeOffRequest;
  kind: NotificationKind;
  fromId: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
}) {
  const sender = getPerson(input.fromId);
  if (!sender || sender.isDemo) {
    insertNotification({
      requestId: input.request.id,
      kind: input.kind,
      fromEmail: input.fromEmail,
      toEmail: input.toEmail,
      subject: input.subject,
      bodyHtml: input.html,
      status: "simulated",
      detail: "Saved in the demo directory. Nothing was sent through Microsoft.",
      graphId: null,
    });
    return;
  }
  try {
    const token = await getAccessToken(input.fromId);
    await sendMail(token, {
      subject: input.subject,
      html: input.html,
      to: input.toEmail,
      toName: input.toName,
    });
    insertNotification({
      requestId: input.request.id,
      kind: input.kind,
      fromEmail: input.fromEmail,
      toEmail: input.toEmail,
      subject: input.subject,
      bodyHtml: input.html,
      status: "sent",
      detail: `Sent from ${input.fromEmail} to ${input.toEmail}.`,
      graphId: null,
    });
  } catch (error) {
    insertNotification({
      requestId: input.request.id,
      kind: input.kind,
      fromEmail: input.fromEmail,
      toEmail: input.toEmail,
      subject: input.subject,
      bodyHtml: input.html,
      status: "failed",
      detail: explainGraphFailure(error, `email ${input.toName}`),
      graphId: null,
    });
  }
}

export async function deliverRequestEmail(request: TimeOffRequest) {
  const mail = requestEmail(mailFields(request));
  await deliverEmail({
    request,
    kind: "request_email",
    fromId: request.requesterId,
    fromEmail: request.requesterEmail,
    toEmail: request.approverEmail,
    toName: request.approverName,
    subject: mail.subject,
    html: mail.html,
  });
}

export async function deliverDecisionEmail(request: TimeOffRequest) {
  const mail = decisionEmail({
    ...mailFields(request),
    approved: request.status === "approved",
    calendar: request.status === "approved" && calendarIntegrationEnabled(),
  });
  await deliverEmail({
    request,
    kind: "decision_email",
    fromId: request.approverId,
    fromEmail: request.approverEmail,
    toEmail: request.requesterEmail,
    toName: request.requesterName,
    subject: mail.subject,
    html: mail.html,
  });
}

export async function deliverCancelEmail(request: TimeOffRequest) {
  const mail = cancelEmail(mailFields(request));
  await deliverEmail({
    request,
    kind: "cancel_email",
    fromId: request.requesterId,
    fromEmail: request.requesterEmail,
    toEmail: request.approverEmail,
    toName: request.approverName,
    subject: mail.subject,
    html: mail.html,
  });
}

export async function deliverCalendarInvite(request: TimeOffRequest) {
  const requester = getPerson(request.requesterId);
  const primary = calendarInvite(request);
  if (!requester || requester.isDemo) {
    insertNotification({
      requestId: request.id,
      kind: "calendar_invite",
      fromEmail: request.requesterEmail,
      toEmail: primary.event.attendees[0]?.emailAddress.address ?? "",
      subject: primary.subject,
      bodyHtml: primary.html,
      status: "simulated",
      detail: "All-day invite saved in the demo directory. It would be created on the employee's calendar with IT Ops as the attendee.",
      graphId: null,
    });
    return;
  }

  try {
    const token = await getAccessToken(request.requesterId);
    const created = await createEvent(token, primary.event);
    insertNotification({
      requestId: request.id,
      kind: "calendar_invite",
      fromEmail: request.requesterEmail,
      toEmail: primary.event.attendees[0].emailAddress.address,
      subject: primary.subject,
      bodyHtml: primary.html,
      status: "sent",
      detail: `All-day event on ${request.requesterName}'s calendar. ${request.requesterName} is marked out of office, and IT Ops is invited.`,
      graphId: created.id ?? null,
    });
    return;
  } catch (employeeError) {
    const fallback = calendarInvite(request, {
      showAs: "free",
      organizerName: request.approverName,
    });
    try {
      const token = await getAccessToken(request.approverId);
      const created = await createEvent(token, fallback.event);
      insertNotification({
        requestId: request.id,
        kind: "calendar_invite",
        fromEmail: request.approverEmail,
        toEmail: fallback.event.attendees[0].emailAddress.address,
        subject: fallback.subject,
        bodyHtml: fallback.html,
        status: "sent",
        detail: `Sent from ${request.approverName}'s calendar because ${request.requesterName}'s Microsoft session was not available. The approver is not marked out of office. ${explainGraphFailure(employeeError, "use the employee's calendar")}`,
        graphId: created.id ?? null,
      });
    } catch (approverError) {
      insertNotification({
        requestId: request.id,
        kind: "calendar_invite",
        fromEmail: request.requesterEmail,
        toEmail: primary.event.attendees[0].emailAddress.address,
        subject: primary.subject,
        bodyHtml: primary.html,
        status: "failed",
        detail: `${explainGraphFailure(employeeError, "create the invite on the employee's calendar")} ${explainGraphFailure(approverError, "create it from the approver's calendar")}`,
        graphId: null,
      });
    }
  }
}

export async function resendKind(request: TimeOffRequest, kind: NotificationKind) {
  if (kind === "request_email") await deliverRequestEmail(request);
  else if (kind === "decision_email") await deliverDecisionEmail(request);
  else if (kind === "cancel_email") await deliverCancelEmail(request);
  else await deliverCalendarInvite(request);
}
