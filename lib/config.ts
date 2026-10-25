const DEV_SECRET = "dev-only-timeoff-secret-change-for-production";

function env(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function appSecret(): string {
  return env("AUTH_SECRET") || DEV_SECRET;
}

export function usingDevSecret(): boolean {
  return !env("AUTH_SECRET");
}

export function orgTimezone(): string {
  return env("ORG_TIMEZONE") || "America/Chicago";
}

export function graphTimeZone(): string {
  return env("ORG_GRAPH_TIMEZONE") || "Central Standard Time";
}

export function itopsEmail(): string {
  return env("ITOPS_EMAIL") || "itops@ttecdigital.com";
}

export function appBaseUrl(): string {
  return (env("AUTH_URL") || "http://localhost:3847").replace(/\/$/, "");
}

export function appUrl(path: string): string {
  return `${appBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const graphScopes = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "User.Read.All",
  "Mail.Send",
  "Calendars.ReadWrite",
].join(" ");

export type EntraSettings = {
  clientId: string;
  clientSecret: string;
  issuer: string | null;
  tenantId: string | null;
  configured: boolean;
  missing: string[];
};

export function entraSettings(): EntraSettings {
  const clientId = env("AUTH_MICROSOFT_ENTRA_ID_ID");
  const clientSecret = env("AUTH_MICROSOFT_ENTRA_ID_SECRET");
  const explicitIssuer = env("AUTH_MICROSOFT_ENTRA_ID_ISSUER");
  const tenantId = env("AUTH_MICROSOFT_ENTRA_ID_TENANT_ID");
  const issuer =
    explicitIssuer ||
    (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : null);
  const secret = env("AUTH_SECRET");
  const missing: string[] = [];
  if (!clientId) missing.push("AUTH_MICROSOFT_ENTRA_ID_ID");
  if (!clientSecret) missing.push("AUTH_MICROSOFT_ENTRA_ID_SECRET");
  if (!issuer) missing.push("AUTH_MICROSOFT_ENTRA_ID_TENANT_ID");
  if (!secret) missing.push("AUTH_SECRET");
  const parsedTenant = issuer ? tenantIdFromIssuer(issuer) : tenantId || null;
  return {
    clientId,
    clientSecret,
    issuer,
    tenantId: parsedTenant,
    configured: missing.length === 0,
    missing,
  };
}

export function tenantIdFromIssuer(issuer: string): string | null {
  const match = issuer.match(/microsoftonline\.com\/([^/]+)\//i);
  return match?.[1] ?? null;
}

export function demoAllowed(): boolean {
  const flag = env("DEMO_MODE").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production" && !entraSettings().configured;
}
