import { randomUUID } from "node:crypto";
import { orgTimezone } from "./config";
import { formatRange, todayISO } from "./dates";
import {
  deliverCalendarInvite,
  deliverCancelEmail,
  deliverDecisionEmail,
  deliverRequestEmail,
  resendKind,
} from "./notify";
import { canCancelRequest, canDecideRequest, canViewRequest } from "./permissions";
import {
  decideRequestRow,
  descendantIds,
  findOverlap,
  getNotification,
  getRequest,
  insertRequest,
} from "./repo";
import { calendarIntegrationEnabled } from "./settings";
import { isEmail, statusLabel, typeLabel } from "./text";
import type { AppUser, NotificationKind, TimeOffRequest } from "./types";
import { validateDraft } from "./validate";

function assertVisible(user: AppUser, request: TimeOffRequest) {
  if (!canViewRequest(user.id, request, descendantIds(user.id))) {
    throw new Error("You don't have access to that request.");
  }
}

export async function submitTimeOff(
  user: AppUser,
  raw: { type: string; startDate: string; endDate: string; notes: string },
): Promise<string> {
  const parsed = validateDraft(raw, todayISO(orgTimezone()));
  if (!parsed.ok) throw new Error(parsed.error);
  if (!user.managerId || !user.managerName || !user.managerEmail || !isEmail(user.managerEmail)) {
    throw new Error(
      "No manager is set on your Microsoft Entra profile, so this request has nowhere to go. Ask IT to set your manager, then sign in again.",
    );
  }
  const overlap = findOverlap(user.id, parsed.value.startDate, parsed.value.endDate);
  if (overlap) {
    throw new Error(
      `Those dates overlap a ${statusLabel(overlap.status).toLowerCase()} ${typeLabel(overlap.type)} request for ${formatRange(overlap.startDate, overlap.endDate)}. Cancel that request or wait until it's decided.`,
    );
  }
  const id = randomUUID();
  insertRequest({
    id,
    requesterId: user.id,
    requesterName: user.name,
    requesterEmail: user.email,
    approverId: user.managerId,
    approverName: user.managerName,
    approverEmail: user.managerEmail,
    type: parsed.value.type,
    startDate: parsed.value.startDate,
    endDate: parsed.value.endDate,
    notes: parsed.value.notes,
    createdAt: new Date().toISOString(),
  });
  const stored = getRequest(id);
  if (!stored) throw new Error("The request was not saved.");
  await deliverRequestEmail(stored);
  return id;
}

export async function decideTimeOff(
  user: AppUser,
  requestId: string,
  decision: "approved" | "denied",
  note: string,
): Promise<void> {
  const request = getRequest(requestId);
  if (!request || !canViewRequest(user.id, request, descendantIds(user.id))) {
    throw new Error("That request is not in your queue.");
  }
  if (!canDecideRequest(user.id, request)) {
    throw new Error("Only the manager named on this request can approve or deny it.");
  }
  const trimmed = note.trim();
  if (trimmed.length > 2000) throw new Error("Keep the note under 2,000 characters.");
  if (decision === "denied" && trimmed.length < 3) {
    throw new Error("Add a short note so they know why this was denied.");
  }
  decideRequestRow({
    id: request.id,
    status: decision,
    decisionNote: trimmed || null,
    decidedAt: new Date().toISOString(),
    decidedById: user.id,
    decidedByName: user.name,
  });
  const updated = getRequest(request.id);
  if (!updated) throw new Error("The decision was not saved.");
  await deliverDecisionEmail(updated);
  if (decision === "approved" && calendarIntegrationEnabled()) await deliverCalendarInvite(updated);
}

export async function cancelTimeOff(user: AppUser, requestId: string): Promise<void> {
  const request = getRequest(requestId);
  if (!request || !canViewRequest(user.id, request, descendantIds(user.id))) {
    throw new Error("That request is not yours.");
  }
  if (!canCancelRequest(user.id, request)) {
    throw new Error("Only a pending request can be cancelled, and only by the person who submitted it.");
  }
  decideRequestRow({
    id: request.id,
    status: "cancelled",
    decisionNote: null,
    decidedAt: new Date().toISOString(),
    decidedById: user.id,
    decidedByName: user.name,
  });
  const updated = getRequest(request.id);
  if (!updated) throw new Error("The cancellation was not saved.");
  await deliverCancelEmail(updated);
}

export async function resendTimeOff(user: AppUser, notificationId: string): Promise<void> {
  const notification = getNotification(notificationId);
  if (!notification) throw new Error("That message is not on the request.");
  const request = getRequest(notification.requestId);
  if (!request) throw new Error("That request is gone.");
  assertVisible(user, request);
  if (notification.status !== "failed") throw new Error("This message already went out.");
  const kind = notification.kind as NotificationKind;
  if (kind === "calendar_invite" && !calendarIntegrationEnabled()) {
    throw new Error("Calendar invites are turned off. Turn them on before sending this one again.");
  }
  await resendKind(request, kind);
}
