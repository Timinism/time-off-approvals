import type { TimeOffRequest } from "./types";

export function canViewRequest(
  userId: string,
  request: Pick<TimeOffRequest, "requesterId" | "approverId">,
  descendantIds: Iterable<string>,
): boolean {
  if (request.requesterId === userId || request.approverId === userId) return true;
  const tree = descendantIds instanceof Set ? descendantIds : new Set(descendantIds);
  return tree.has(request.requesterId) || tree.has(request.approverId);
}

export function canDecideRequest(
  userId: string,
  request: Pick<TimeOffRequest, "approverId" | "status">,
): boolean {
  return request.status === "pending" && request.approverId === userId;
}

export function canCancelRequest(
  userId: string,
  request: Pick<TimeOffRequest, "requesterId" | "status">,
): boolean {
  return request.status === "pending" && request.requesterId === userId;
}
