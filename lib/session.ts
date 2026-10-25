import { cookies } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { appSecret, demoAllowed, orgTimezone } from "./config";
import { DEMO_COOKIE, openValue } from "./crypto";
import { seedDemo } from "./demo-seed";
import { syncDirectory } from "./directory";
import {
  countManagedRequests,
  countPendingApprovals,
  getPerson,
  listDirectReports,
  setDirectoryError,
  type PersonRecord,
} from "./repo";
import { errorMessage } from "./text";
import { getAccessToken } from "./tokens";
import type { AppUser } from "./types";

function toAppUser(person: PersonRecord, source: AppUser["source"]): AppUser {
  const directReports = listDirectReports(person.id);
  const pendingApprovalCount = countPendingApprovals(person.id);
  const managesTeam = directReports.length > 0 || countManagedRequests(person.id) > 0;
  return {
    id: person.id,
    email: person.email,
    name: person.name,
    jobTitle: person.jobTitle,
    department: person.department,
    managerId: person.managerId,
    managerName: person.managerName,
    managerEmail: person.managerEmail,
    isDemo: person.isDemo,
    directoryError: person.directoryError,
    directReports,
    pendingApprovalCount,
    managesTeam,
    source,
  };
}

async function ensureFreshDirectory(person: PersonRecord) {
  if (person.isDemo) return person;
  const refreshed = person.profileRefreshedAt ? Date.parse(person.profileRefreshedAt) : 0;
  if (refreshed && Date.now() - refreshed < 10 * 60 * 1000) return person;
  try {
    const token = await getAccessToken(person.id);
    await syncDirectory(person.id, token);
  } catch (error) {
    setDirectoryError(person.id, errorMessage(error), new Date().toISOString());
  }
  return getPerson(person.id) ?? person;
}

export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const session = await auth();
  const sessionId = session?.user?.id;
  if (sessionId) {
    const existing = getPerson(sessionId);
    if (!existing) return null;
    const person = await ensureFreshDirectory(existing);
    return toAppUser(person, "entra");
  }

  if (!demoAllowed()) return null;
  const jar = await cookies();
  const sealed = jar.get(DEMO_COOKIE)?.value;
  if (!sealed) return null;
  const id = openValue(sealed, appSecret());
  if (!id?.startsWith("demo-")) return null;
  seedDemo();
  const person = getPerson(id);
  if (!person) return null;
  return toAppUser(person, "demo");
});

export function orgZone(): string {
  return orgTimezone();
}
