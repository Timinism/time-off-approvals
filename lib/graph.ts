const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

export class GraphError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GraphError";
    this.status = status;
    this.code = code;
  }
}

export function explainGraphFailure(error: unknown, action: string): string {
  const message = error instanceof Error && error.message ? error.message : "Unknown Microsoft error.";
  const status = error instanceof GraphError ? error.status : 0;
  if (status === 401 || /expired|InvalidAuthenticationToken|lifetime validation failed/i.test(message)) {
    return `Microsoft rejected the sign-in while trying to ${action}. Sign out and sign in again.`;
  }
  if (status === 403 || status === 401) {
    return `Microsoft refused to ${action}. An admin may still need to grant consent for User.Read.All, Mail.Send, and Calendars.ReadWrite. ${message}`;
  }
  return `Couldn't ${action}. ${message}`;
}

async function graphFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_ROOT}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...init, headers });
  if (response.status === 202 || response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  let payload: { error?: { message?: string; code?: string } } | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as { error?: { message?: string; code?: string } };
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    throw new GraphError(
      payload?.error?.message || text || response.statusText,
      response.status,
      payload?.error?.code,
    );
  }
  return payload as T;
}

export type GraphUser = {
  id: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
  jobTitle?: string | null;
  department?: string | null;
};

export function graphEmail(user: GraphUser): string {
  return user.mail || user.userPrincipalName || "";
}

export async function graphGet<T>(token: string, path: string): Promise<T> {
  return graphFetch<T>(token, path);
}

export async function graphPost<T>(token: string, path: string, body: unknown): Promise<T> {
  return graphFetch<T>(token, path, { method: "POST", body: JSON.stringify(body) });
}

export async function graphList<T>(token: string, path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;
  for (let page = 0; page < 10 && next; page += 1) {
    const payload: { value?: T[]; "@odata.nextLink"?: string } = await graphFetch(token, next);
    items.push(...(payload.value ?? []));
    next = payload["@odata.nextLink"] ?? null;
  }
  return items;
}

export async function sendMail(
  token: string,
  message: { subject: string; html: string; to: string; toName?: string },
) {
  await graphPost(token, "/me/sendMail", {
    saveToSentItems: true,
    message: {
      subject: message.subject,
      body: { contentType: "HTML", content: message.html },
      toRecipients: [
        { emailAddress: { address: message.to, name: message.toName || message.to } },
      ],
    },
  });
}

export async function createEvent(token: string, event: unknown): Promise<{ id?: string }> {
  return graphPost<{ id?: string }>(token, "/me/events", event);
}
