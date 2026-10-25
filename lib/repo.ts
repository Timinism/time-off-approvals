import { randomUUID } from "node:crypto";
import { sqlAll, sqlGet, sqlRun, transaction } from "./db";
import type {
  DirectReport,
  LeaveType,
  NotificationKind,
  NotificationRecord,
  NotificationStatus,
  RequestStatus,
  TimeOffRequest,
} from "./types";

export type PersonRecord = {
  id: string;
  email: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  managerName: string | null;
  managerEmail: string | null;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  tokenExpiresAt: number | null;
  profileRefreshedAt: string | null;
  directoryError: string | null;
  isDemo: boolean;
};

export type ReportEdge = DirectReport & { managerId: string };

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be text.`);
  return value;
}

function textOrNull(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`Expected ${key} to be text.`);
  return value;
}

function numberOrNull(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected ${key} to be a number.`);
}

function mapPerson(row: Record<string, unknown>): PersonRecord {
  return {
    id: text(row, "id"),
    email: text(row, "email"),
    name: text(row, "name"),
    jobTitle: textOrNull(row, "job_title"),
    department: textOrNull(row, "department"),
    managerId: textOrNull(row, "manager_id"),
    managerName: textOrNull(row, "manager_name"),
    managerEmail: textOrNull(row, "manager_email"),
    accessTokenEnc: textOrNull(row, "access_token_enc"),
    refreshTokenEnc: textOrNull(row, "refresh_token_enc"),
    tokenExpiresAt: numberOrNull(row, "token_expires_at"),
    profileRefreshedAt: textOrNull(row, "profile_refreshed_at"),
    directoryError: textOrNull(row, "directory_error"),
    isDemo: row.is_demo === 1,
  };
}

function mapRequest(row: Record<string, unknown>): TimeOffRequest {
  return {
    id: text(row, "id"),
    requesterId: text(row, "requester_id"),
    requesterName: text(row, "requester_name"),
    requesterEmail: text(row, "requester_email"),
    approverId: text(row, "approver_id"),
    approverName: text(row, "approver_name"),
    approverEmail: text(row, "approver_email"),
    type: text(row, "type") as LeaveType,
    startDate: text(row, "start_date"),
    endDate: text(row, "end_date"),
    notes: text(row, "notes"),
    status: text(row, "status") as RequestStatus,
    decisionNote: textOrNull(row, "decision_note"),
    createdAt: text(row, "created_at"),
    decidedAt: textOrNull(row, "decided_at"),
    decidedById: textOrNull(row, "decided_by_id"),
    decidedByName: textOrNull(row, "decided_by_name"),
  };
}

function mapNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: text(row, "id"),
    requestId: text(row, "request_id"),
    kind: text(row, "kind") as NotificationKind,
    fromEmail: text(row, "from_email"),
    toEmail: text(row, "to_email"),
    subject: text(row, "subject"),
    bodyHtml: text(row, "body_html"),
    status: text(row, "status") as NotificationStatus,
    detail: textOrNull(row, "detail"),
    graphId: textOrNull(row, "graph_id"),
    createdAt: text(row, "created_at"),
  };
}

function mapEdge(row: Record<string, unknown>): ReportEdge {
  return {
    managerId: text(row, "manager_id"),
    id: text(row, "report_id"),
    name: text(row, "report_name"),
    email: text(row, "report_email"),
    jobTitle: textOrNull(row, "report_title"),
  };
}

export function getPerson(id: string): PersonRecord | null {
  const row = sqlGet("SELECT * FROM people WHERE id = ?", [id]);
  return row ? mapPerson(row) : null;
}

export function upsertIdentity(input: { id: string; email: string; name: string; isDemo?: boolean }) {
  sqlRun(
    `INSERT INTO people (id, email, name, is_demo)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name`,
    [input.id, input.email, input.name, input.isDemo ? 1 : 0],
  );
}

export function saveProfile(input: {
  id: string;
  email: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  managerName: string | null;
  managerEmail: string | null;
  directoryError: string | null;
  refreshedAt: string;
  isDemo?: boolean;
}) {
  sqlRun(
    `INSERT INTO people (
       id, email, name, job_title, department, manager_id, manager_name, manager_email,
       profile_refreshed_at, directory_error, is_demo
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       job_title = excluded.job_title,
       department = excluded.department,
       manager_id = excluded.manager_id,
       manager_name = excluded.manager_name,
       manager_email = excluded.manager_email,
       profile_refreshed_at = excluded.profile_refreshed_at,
       directory_error = excluded.directory_error`,
    [
      input.id,
      input.email,
      input.name,
      input.jobTitle,
      input.department,
      input.managerId,
      input.managerName,
      input.managerEmail,
      input.refreshedAt,
      input.directoryError,
      input.isDemo ? 1 : 0,
    ],
  );
}

export function saveTokens(
  id: string,
  tokens: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null },
) {
  const current = getPerson(id);
  if (!current) throw new Error("Cannot store a Microsoft token before the person exists.");
  sqlRun(
    `UPDATE people
     SET access_token_enc = ?, refresh_token_enc = ?, token_expires_at = ?
     WHERE id = ?`,
    [
      tokens.accessToken === undefined ? current.accessTokenEnc : tokens.accessToken,
      tokens.refreshToken === undefined ? current.refreshTokenEnc : tokens.refreshToken,
      tokens.expiresAt === undefined ? current.tokenExpiresAt : tokens.expiresAt,
      id,
    ],
  );
}

export function setDirectoryError(id: string, message: string | null, refreshedAt: string) {
  sqlRun("UPDATE people SET directory_error = ?, profile_refreshed_at = ? WHERE id = ?", [
    message,
    refreshedAt,
    id,
  ]);
}

export function replaceReports(
  managerId: string,
  reports: Array<{ id: string; name: string; email: string; jobTitle: string | null }>,
) {
  transaction(() => {
    sqlRun("DELETE FROM report_edges WHERE manager_id = ?", [managerId]);
    for (const report of reports) {
      sqlRun(
        `INSERT INTO report_edges (manager_id, report_id, report_name, report_email, report_title)
         VALUES (?, ?, ?, ?, ?)`,
        [managerId, report.id, report.name, report.email, report.jobTitle],
      );
    }
  });
}

export function listDirectReports(managerId: string): DirectReport[] {
  return sqlAll(
    `SELECT report_id, report_name, report_email, report_title
     FROM report_edges WHERE manager_id = ? ORDER BY report_name`,
    [managerId],
  ).map((row) => ({
    id: text(row, "report_id"),
    name: text(row, "report_name"),
    email: text(row, "report_email"),
    jobTitle: textOrNull(row, "report_title"),
  }));
}

export function listEdgesInTree(userId: string): ReportEdge[] {
  return sqlAll(
    `WITH RECURSIVE tree(id, depth) AS (
       SELECT ?, 0
       UNION
       SELECT e.report_id, tree.depth + 1
       FROM report_edges e
       JOIN tree ON e.manager_id = tree.id
       WHERE tree.depth < 6
     )
     SELECT manager_id, report_id, report_name, report_email, report_title
     FROM report_edges
     WHERE manager_id IN (SELECT id FROM tree)
     ORDER BY report_name`,
    [userId],
  ).map(mapEdge);
}

export function descendantIds(userId: string): string[] {
  return sqlAll(
    `WITH RECURSIVE tree(id, depth) AS (
       SELECT report_id, 1 FROM report_edges WHERE manager_id = ?
       UNION
       SELECT e.report_id, tree.depth + 1
       FROM report_edges e
       JOIN tree ON e.manager_id = tree.id
       WHERE tree.depth < 6
     )
     SELECT id FROM tree`,
    [userId],
  ).map((row) => text(row, "id"));
}

export function insertHistoricalRequest(input: TimeOffRequest) {
  sqlRun(
    `INSERT INTO requests (
       id, requester_id, requester_name, requester_email, approver_id, approver_name, approver_email,
       type, start_date, end_date, notes, status, decision_note, created_at, decided_at, decided_by_id, decided_by_name
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.requesterId,
      input.requesterName,
      input.requesterEmail,
      input.approverId,
      input.approverName,
      input.approverEmail,
      input.type,
      input.startDate,
      input.endDate,
      input.notes,
      input.status,
      input.decisionNote,
      input.createdAt,
      input.decidedAt,
      input.decidedById,
      input.decidedByName,
    ],
  );
}

export function insertRequest(input: Omit<TimeOffRequest, "decisionNote" | "decidedAt" | "decidedById" | "decidedByName" | "status"> & { status?: RequestStatus }) {
  sqlRun(
    `INSERT INTO requests (
       id, requester_id, requester_name, requester_email, approver_id, approver_name, approver_email,
       type, start_date, end_date, notes, status, decision_note, created_at, decided_at, decided_by_id, decided_by_name
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL)`,
    [
      input.id,
      input.requesterId,
      input.requesterName,
      input.requesterEmail,
      input.approverId,
      input.approverName,
      input.approverEmail,
      input.type,
      input.startDate,
      input.endDate,
      input.notes,
      input.status ?? "pending",
      input.createdAt,
    ],
  );
}

export function decideRequestRow(input: {
  id: string;
  status: RequestStatus;
  decisionNote: string | null;
  decidedAt: string;
  decidedById: string;
  decidedByName: string;
}) {
  const result = sqlRun(
    `UPDATE requests
     SET status = ?, decision_note = ?, decided_at = ?, decided_by_id = ?, decided_by_name = ?
     WHERE id = ? AND status = 'pending'`,
    [input.status, input.decisionNote, input.decidedAt, input.decidedById, input.decidedByName, input.id],
  );
  if (result.changes !== 1) {
    throw new Error("This request has already been decided.");
  }
}

export function getRequest(id: string): TimeOffRequest | null {
  const row = sqlGet("SELECT * FROM requests WHERE id = ?", [id]);
  return row ? mapRequest(row) : null;
}

export function findOverlap(requesterId: string, startDate: string, endDate: string): TimeOffRequest | null {
  const row = sqlGet(
    `SELECT * FROM requests
     WHERE requester_id = ?
       AND status IN ('pending', 'approved')
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [requesterId, endDate, startDate],
  );
  return row ? mapRequest(row) : null;
}

export function listVisibleRequests(userId: string): TimeOffRequest[] {
  return sqlAll(
    `WITH RECURSIVE tree(id, depth) AS (
       SELECT report_id, 1 FROM report_edges WHERE manager_id = ?
       UNION
       SELECT e.report_id, tree.depth + 1
       FROM report_edges e
       JOIN tree ON e.manager_id = tree.id
       WHERE tree.depth < 6
     )
     SELECT * FROM requests
     WHERE requester_id = ?
        OR approver_id = ?
        OR requester_id IN (SELECT id FROM tree)
        OR approver_id IN (SELECT id FROM tree)
     ORDER BY created_at DESC`,
    [userId, userId, userId],
  ).map(mapRequest);
}

export function listPendingForApprover(approverId: string): TimeOffRequest[] {
  return sqlAll(
    `SELECT * FROM requests
     WHERE approver_id = ? AND status = 'pending'
     ORDER BY start_date ASC, created_at ASC`,
    [approverId],
  ).map(mapRequest);
}

export function listRecentDecisions(approverId: string): TimeOffRequest[] {
  return sqlAll(
    `SELECT * FROM requests
     WHERE approver_id = ? AND status IN ('approved', 'denied')
     ORDER BY decided_at DESC
     LIMIT 12`,
    [approverId],
  ).map(mapRequest);
}

export function countPendingApprovals(approverId: string): number {
  const row = sqlGet(
    "SELECT COUNT(*) AS c FROM requests WHERE approver_id = ? AND status = 'pending'",
    [approverId],
  );
  return Number(row?.c ?? 0);
}

export function countManagedRequests(approverId: string): number {
  const row = sqlGet("SELECT COUNT(*) AS c FROM requests WHERE approver_id = ?", [approverId]);
  return Number(row?.c ?? 0);
}

export function insertNotification(input: Omit<NotificationRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  const id = input.id ?? randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  sqlRun(
    `INSERT INTO notifications (
       id, request_id, kind, from_email, to_email, subject, body_html, status, detail, graph_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.requestId,
      input.kind,
      input.fromEmail,
      input.toEmail,
      input.subject,
      input.bodyHtml,
      input.status,
      input.detail,
      input.graphId,
      createdAt,
    ],
  );
  return id;
}

export function listNotifications(requestId: string): NotificationRecord[] {
  return sqlAll(
    "SELECT * FROM notifications WHERE request_id = ? ORDER BY created_at ASC, id ASC",
    [requestId],
  ).map(mapNotification);
}

export function getNotification(id: string): NotificationRecord | null {
  const row = sqlGet("SELECT * FROM notifications WHERE id = ?", [id]);
  return row ? mapNotification(row) : null;
}

export function countDemoPeople(): number {
  const row = sqlGet("SELECT COUNT(*) AS c FROM people WHERE is_demo = 1");
  return Number(row?.c ?? 0);
}
