import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { entraSettings, itopsEmail } from "@/lib/config";

export const metadata = { title: "Connect Microsoft Entra" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  const settings = entraSettings();
  const consent =
    settings.clientId && settings.tenantId
      ? `https://login.microsoftonline.com/${settings.tenantId}/adminconsent?client_id=${settings.clientId}`
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/sign-in" className="text-sm text-primary">
          Back to sign in
        </Link>
        <ThemeToggle />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Connect Microsoft Entra</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Time Off signs people in with their Microsoft 365 account, reads the manager already stored
        in Entra, and sends mail from the signed-in mailbox. Calendar invites are off until a
        manager turns them on.
      </p>

      <ol className="mt-8 space-y-6 text-sm leading-6">
        <li>
          <strong>Register an app.</strong> In the Entra admin center, create an app registration
          named Time Off. Supported account type: this directory only.
        </li>
        <li>
          <strong>Add a web redirect URI.</strong>
          <code className="mt-2 block rounded-lg bg-sand px-3 py-2 text-xs">
            http://localhost:3847/api/auth/callback/microsoft-entra-id
          </code>
          Add the same path for your deployed site, and for 127.0.0.1 if you open the app that way.
          The URI has to match exactly.
        </li>
        <li>
          <strong>Create a client secret</strong> and copy the value once. You also need the
          Application (client) ID and the Directory (tenant) ID.
        </li>
        <li>
          <strong>Grant delegated Graph permissions</strong>, then grant admin consent:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>User.Read</li>
            <li>User.Read.All, so the app can read each person&apos;s manager and direct reports</li>
            <li>Mail.Send, so the request and the decision go out as the signed-in person</li>
            <li>
              Calendars.ReadWrite, only if a manager will turn on IT Ops calendar invites. Sign in
              again after turning that on so Microsoft grants the calendar permission.
            </li>
            <li>openid, profile, email, and offline_access</li>
          </ul>
          {consent ? (
            <a href={consent} className="mt-2 inline-block text-primary">
              Open the admin consent link
            </a>
          ) : (
            <p className="mt-2 text-muted-foreground">
              After the client ID and tenant ID are in the environment, this page shows an admin
              consent link.
            </p>
          )}
        </li>
        <li>
          <strong>Put this in `.env.local` and restart.</strong>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-sand p-3 text-xs">{`AUTH_SECRET=generate-a-long-random-string
AUTH_URL=http://localhost:3847
AUTH_MICROSOFT_ENTRA_ID_ID=application-client-id
AUTH_MICROSOFT_ENTRA_ID_SECRET=client-secret-value
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=directory-tenant-id
ITOPS_EMAIL=${itopsEmail()}
ORG_TIMEZONE=America/Chicago
ORG_GRAPH_TIMEZONE=Central Standard Time`}</pre>
        </li>
        <li>
          <strong>Set each person&apos;s manager in Entra.</strong> Direct reports are approved by
          you. People under a supervisor on your team are approved by that supervisor, because that
          is who Entra says their manager is. You can still review those requests.
        </li>
      </ol>

      <p className="mt-8 text-sm text-muted-foreground">
        {settings.configured
          ? "Entra is configured. Sign in with Microsoft from the sign-in page."
          : `Still missing: ${settings.missing.join(", ")}.`}
      </p>
    </div>
  );
}
