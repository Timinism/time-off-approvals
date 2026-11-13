import { addDaysISO, atLocalNoon, todayISO } from "./dates";
import { DEMO_PEOPLE, demoPerson } from "./demo-people";
import { appUrl, orgTimezone } from "./config";
import { calendarInvite, decisionEmail, requestEmail } from "./messages";
import { calendarIntegrationEnabled } from "./settings";
import {
  countDemoPeople,
  insertHistoricalRequest,
  insertNotification,
  replaceReports,
  saveProfile,
} from "./repo";
import type { LeaveType, RequestStatus, TimeOffRequest } from "./types";

function person(id: string) {
  const found = demoPerson(id);
  if (!found) throw new Error(`Missing demo person ${id}.`);
  return found;
}

function buildRequest(input: {
  id: string;
  requesterId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  decisionNote?: string | null;
}): TimeOffRequest {
  const requester = person(input.requesterId);
  const manager = person(requester.managerId || "");
  return {
    id: input.id,
    requesterId: requester.id,
    requesterName: requester.name,
    requesterEmail: requester.email,
    approverId: manager.id,
    approverName: manager.name,
    approverEmail: manager.email,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    notes: input.notes,
    status: input.status,
    decisionNote: input.decisionNote ?? null,
    createdAt: input.createdAt,
    decidedAt: input.decidedAt ?? null,
    decidedById: input.decidedAt ? manager.id : null,
    decidedByName: input.decidedAt ? manager.name : null,
  };
}

function rememberEmail(request: TimeOffRequest, when: string) {
  const mail = requestEmail({
    ...request,
    requestUrl: appUrl(`/requests/${request.id}`),
  });
  insertNotification({
    id: `${request.id}-request-email`,
    requestId: request.id,
    kind: "request_email",
    fromEmail: request.requesterEmail,
    toEmail: request.approverEmail,
    subject: mail.subject,
    bodyHtml: mail.html,
    status: "simulated",
    detail: "Saved in the demo directory. Nothing was sent through Microsoft.",
    graphId: null,
    createdAt: when,
  });
}

function rememberDecision(request: TimeOffRequest, when: string, calendar: boolean) {
  const mail = decisionEmail({
    ...request,
    requestUrl: appUrl(`/requests/${request.id}`),
    approved: request.status === "approved",
    calendar: request.status === "approved" && calendar,
  });
  insertNotification({
    id: `${request.id}-decision-email`,
    requestId: request.id,
    kind: "decision_email",
    fromEmail: request.approverEmail,
    toEmail: request.requesterEmail,
    subject: mail.subject,
    bodyHtml: mail.html,
    status: "simulated",
    detail: "Saved in the demo directory. Nothing was sent through Microsoft.",
    graphId: null,
    createdAt: when,
  });
}

function rememberCalendar(request: TimeOffRequest, when: string) {
  const invite = calendarInvite(request);
  insertNotification({
    id: `${request.id}-calendar`,
    requestId: request.id,
    kind: "calendar_invite",
    fromEmail: request.requesterEmail,
    toEmail: invite.event.attendees[0].emailAddress.address,
    subject: invite.subject,
    bodyHtml: invite.html,
    status: "simulated",
    detail: "All-day invite saved in the demo directory. It would be created on the employee's calendar with IT Ops as the attendee.",
    graphId: null,
    createdAt: when,
  });
}

export function seedDemo() {
  if (countDemoPeople() > 0) return;
  const now = new Date().toISOString();
  for (const member of DEMO_PEOPLE) {
    const manager = member.managerId ? demoPerson(member.managerId) : null;
    saveProfile({
      id: member.id,
      email: member.email,
      name: member.name,
      jobTitle: member.jobTitle,
      department: member.department,
      managerId: manager?.id ?? null,
      managerName: manager?.name ?? null,
      managerEmail: manager?.email ?? null,
      directoryError: null,
      refreshedAt: now,
      isDemo: true,
    });
  }

  const edge = (id: string) => {
    const member = person(id);
    return { id: member.id, name: member.name, email: member.email, jobTitle: member.jobTitle };
  };
  replaceReports("demo-alex", [edge("demo-jordan"), edge("demo-sam")]);
  replaceReports("demo-sam", [edge("demo-riley"), edge("demo-casey")]);

  const today = todayISO(orgTimezone());
  const jordanPastStart = addDaysISO(today, -24);
  const jordanPastEnd = addDaysISO(today, -22);
  const jordanSick = addDaysISO(today, 1);
  const samStart = addDaysISO(today, -10);
  const samEnd = addDaysISO(today, -9);
  const rileySick = addDaysISO(today, -6);
  const rileyStart = addDaysISO(today, 30);
  const rileyEnd = addDaysISO(today, 32);
  const caseyStart = addDaysISO(today, 18);
  const caseyEnd = addDaysISO(today, 19);

  const records: TimeOffRequest[] = [
    buildRequest({
      id: "demo-req-jordan-past",
      requesterId: "demo-jordan",
      type: "pto",
      startDate: jordanPastStart,
      endDate: jordanPastEnd,
      notes: "Door County with family.",
      status: "approved",
      createdAt: atLocalNoon(addDaysISO(jordanPastStart, -12)),
      decidedAt: atLocalNoon(addDaysISO(jordanPastStart, -8)),
      decisionNote: "Enjoy the trip. I'll cover the Thursday stand-up.",
    }),
    buildRequest({
      id: "demo-req-jordan-sick",
      requesterId: "demo-jordan",
      type: "sick",
      startDate: jordanSick,
      endDate: jordanSick,
      notes: "Woke up with a fever and I'm not coming in.",
      status: "pending",
      createdAt: atLocalNoon(today),
    }),
    buildRequest({
      id: "demo-req-sam-denied",
      requesterId: "demo-sam",
      type: "pto",
      startDate: samStart,
      endDate: samEnd,
      notes: "Wanted these days off for a friend's wedding.",
      status: "denied",
      createdAt: atLocalNoon(addDaysISO(samStart, -6)),
      decidedAt: atLocalNoon(addDaysISO(samStart, -4)),
      decisionNote: "We need you on-site for the network cutover. Let's look at the week after.",
    }),
    buildRequest({
      id: "demo-req-riley-sick",
      requesterId: "demo-riley",
      type: "sick",
      startDate: rileySick,
      endDate: rileySick,
      notes: "Migraine, left after standup.",
      status: "approved",
      createdAt: atLocalNoon(rileySick),
      decidedAt: atLocalNoon(rileySick),
      decisionNote: "Feel better. I'll watch the queue.",
    }),
    buildRequest({
      id: "demo-req-riley-pto",
      requesterId: "demo-riley",
      type: "pto",
      startDate: rileyStart,
      endDate: rileyEnd,
      notes: "Visiting my sister for the long weekend.",
      status: "approved",
      createdAt: atLocalNoon(addDaysISO(today, -2)),
      decidedAt: atLocalNoon(addDaysISO(today, -1)),
      decisionNote: "Approved. Casey has the on-call phone.",
    }),
    buildRequest({
      id: "demo-req-casey-pto",
      requesterId: "demo-casey",
      type: "pto",
      startDate: caseyStart,
      endDate: caseyEnd,
      notes: "Out for a wedding in Madison.",
      status: "pending",
      createdAt: atLocalNoon(addDaysISO(today, -1)),
    }),
  ];

  const calendar = calendarIntegrationEnabled();
  for (const request of records) {
    insertHistoricalRequest(request);
    rememberEmail(request, request.createdAt);
    if (request.decidedAt) {
      rememberDecision(request, request.decidedAt, calendar);
    }
    if (calendar && request.status === "approved" && request.decidedAt) {
      rememberCalendar(request, request.decidedAt);
    }
  }
}
