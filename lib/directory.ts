import { graphEmail, graphGet, graphList, explainGraphFailure, GraphError, type GraphUser } from "./graph";
import { isEmail } from "./text";
import { replaceReports, saveProfile, setDirectoryError } from "./repo";

const USER_SELECT = "id,displayName,mail,userPrincipalName,jobTitle,department";

function display(user: GraphUser, fallback: string): string {
  return user.displayName || graphEmail(user) || fallback;
}

export async function syncDirectory(userId: string, accessToken: string): Promise<void> {
  const refreshedAt = new Date().toISOString();
  let me: GraphUser;
  try {
    me = await graphGet<GraphUser>(accessToken, `/me?$select=${USER_SELECT}`);
  } catch (error) {
    setDirectoryError(userId, explainGraphFailure(error, "read your profile"), refreshedAt);
    return;
  }

  let manager: GraphUser | null = null;
  let directoryError: string | null = null;
  try {
    manager = await graphGet<GraphUser>(accessToken, `/me/manager?$select=${USER_SELECT}`);
  } catch (error) {
    if (!(error instanceof GraphError && error.status === 404)) {
      directoryError = explainGraphFailure(error, "read your manager");
    }
  }

  const managerEmail = manager ? graphEmail(manager) : null;
  if (manager && managerEmail && !isEmail(managerEmail)) {
    directoryError = "Your manager's email in Entra is not usable, so Time Off cannot mail them.";
  }

  let reports: GraphUser[] = [];
  if (!directoryError) {
    try {
      reports = await graphList<GraphUser>(
        accessToken,
        `/me/directReports?$select=${USER_SELECT}`,
      );
    } catch (error) {
      directoryError = explainGraphFailure(error, "read your direct reports");
    }
  }

  saveProfile({
    id: userId,
    email: graphEmail(me) || "",
    name: display(me, "Signed-in user"),
    jobTitle: me.jobTitle ?? null,
    department: me.department ?? null,
    managerId: manager?.id ?? null,
    managerName: manager ? display(manager, "Manager") : null,
    managerEmail: managerEmail && isEmail(managerEmail) ? managerEmail : null,
    directoryError,
    refreshedAt,
  });

  if (directoryError) return;

  const mapped = reports
    .map((report) => ({
      id: report.id,
      name: display(report, "Direct report"),
      email: graphEmail(report),
      jobTitle: report.jobTitle ?? null,
    }))
    .filter((report) => report.id && report.email);
  replaceReports(userId, mapped);

  for (const report of mapped) {
    try {
      const kids = await graphList<GraphUser>(
        accessToken,
        `/users/${report.id}/directReports?$select=${USER_SELECT}`,
      );
      replaceReports(
        report.id,
        kids
          .map((kid) => ({
            id: kid.id,
            name: display(kid, "Team member"),
            email: graphEmail(kid),
            jobTitle: kid.jobTitle ?? null,
          }))
          .filter((kid) => kid.id && kid.email),
      );
    } catch {
      // Keep any edges already stored for this supervisor. One unreadable team
      // should not wipe the rest of the directory sync.
    }
  }
}
