export const LEAVE_TYPES = ["pto", "sick"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const REQUEST_STATUSES = ["pending", "approved", "denied", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const NOTIFICATION_KINDS = [
  "request_email",
  "decision_email",
  "cancel_email",
  "calendar_invite",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationStatus = "sent" | "simulated" | "failed";

export type DirectReport = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
};

export type TimeOffRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes: string;
  status: RequestStatus;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedById: string | null;
  decidedByName: string | null;
};

export type NotificationRecord = {
  id: string;
  requestId: string;
  kind: NotificationKind;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  status: NotificationStatus;
  detail: string | null;
  graphId: string | null;
  createdAt: string;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  managerName: string | null;
  managerEmail: string | null;
  isDemo: boolean;
  directoryError: string | null;
  directReports: DirectReport[];
  pendingApprovalCount: number;
  managesTeam: boolean;
  source: "entra" | "demo";
};

export type BlockedRange = {
  id: string;
  type: LeaveType;
  status: RequestStatus;
  startDate: string;
  endDate: string;
};
