import { orgTimezone } from "./config";
import { greeting, todayISO } from "./dates";
import { listEdgesInTree, listPendingForApprover, listRecentDecisions, listVisibleRequests } from "./repo";
import { listNames } from "./text";
import type { AppUser, TimeOffRequest } from "./types";

function byStart(a: TimeOffRequest, b: TimeOffRequest) {
  return a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt);
}

export function homeFeed(user: AppUser) {
  const zone = orgTimezone();
  const today = todayISO(zone);
  const visible = listVisibleRequests(user.id);
  const mine = visible.filter((request) => request.requesterId === user.id);
  const upcomingMine = mine
    .filter((request) => request.status === "approved" && request.endDate >= today)
    .sort(byStart);
  const teamUpcoming = visible
    .filter(
      (request) =>
        request.requesterId !== user.id && request.status === "approved" && request.endDate >= today,
    )
    .sort(byStart);
  return {
    zone,
    today,
    hello: greeting(zone),
    mine,
    upcomingMine,
    waiting: listPendingForApprover(user.id),
    recentDecisions: listRecentDecisions(user.id),
    teamUpcoming,
    recent: visible.slice(0, 5),
    edges: listEdgesInTree(user.id),
  };
}

export function managerIntro(user: AppUser, supervisorNames: string[]): string {
  if (user.directReports.length === 0) {
    if (user.managerName) {
      return `${user.managerName} approves your time off. That name comes from your manager in Microsoft Entra, not from a list in this app.`;
    }
    return "No manager is set on your Entra profile yet, so a request cannot be routed.";
  }
  const reports = listNames(user.directReports.map((person) => person.name));
  const lead = `${reports} report to you, so their requests land in your approvals.`;
  if (supervisorNames.length === 0) return lead;
  return `${lead} ${listNames(supervisorNames)} approve their own teams. You can review that history here without taking the decision.`;
}

export function readFilters(params: { status?: string; type?: string; q?: string }) {
  const status = ["pending", "approved", "denied", "cancelled"].includes(params.status || "")
    ? params.status!
    : "all";
  const type = params.type === "pto" || params.type === "sick" ? params.type : "all";
  const q = (params.q || "").trim().slice(0, 80);
  return { status, type, q };
}

export function applyFilters(
  requests: TimeOffRequest[],
  filters: { status: string; type: string; q?: string },
) {
  return requests.filter((request) => {
    if (filters.status !== "all" && request.status !== filters.status) return false;
    if (filters.type !== "all" && request.type !== filters.type) return false;
    if (filters.q) {
      const haystack = `${request.requesterName} ${request.approverName} ${request.notes}`.toLowerCase();
      if (!haystack.includes(filters.q.toLowerCase())) return false;
    }
    return true;
  });
}
