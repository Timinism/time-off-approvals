# Time Off

Time Off is the request desk for TTEC Digital. People sign in with Microsoft Entra ID, ask for PTO or sick time, and the request goes to the manager already stored on their Entra profile. The manager approves or denies it in the app. Both sides get email, and the history stays in the app. Calendar invites are off until a manager turns them on.

## How a request moves

1. An employee signs in with their Microsoft 365 account and chooses PTO or sick time, the first and last day, and a note.
2. Time Off reads their manager from Microsoft Graph. Direct reports are approved by their manager. People who report to a supervisor are approved by that supervisor, because that is who Entra lists.
3. The employee’s mailbox sends the request email to the manager. The request is also waiting in the manager’s approval queue.
4. Approve or deny sends a decision email back to the employee. The request stays in the history either way.
5. Managers can review history for their own direct reports and for the teams under supervisors who report to them. The decision stays with the direct manager.
6. A manager can turn on IT Ops calendar invites from Home or Approvals. While that is on, an approval also creates an all-day event on the employee’s calendar with `itops@ttecdigital.com` invited. Turning it off stops new invites. People who already signed in need to sign in again so Microsoft grants `Calendars.ReadWrite`.

Sick and PTO notes are included in the manager’s email. They are not copied onto an IT Ops invite.

Until Entra is configured, a sample directory is available on the sign-in page so the same flow can be walked without a tenant. Mail is saved on the request instead of being sent. A calendar invite is saved the same way when that integration is on.

## Run it locally

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847). On the sign-in page, start as Alex Morgan to see the approval queue, Jordan Lee to file a request, or Sam Patel to approve the team under a supervisor.

```bash
npm test
```

## Connect Microsoft Entra

Create an app registration in the Entra admin center.

- Name: Time Off
- Supported accounts: this organization only
- Redirect URI, platform Web:

```text
http://localhost:3847/api/auth/callback/microsoft-entra-id
```

Add the same path for the deployed URL. If you browse the app at `127.0.0.1`, register that host too. The redirect URI has to match exactly, including the port.

Create a client secret. Copy the Application (client) ID, the Directory (tenant) ID, and the secret value.

Under API permissions, add these delegated Microsoft Graph permissions and grant admin consent:

| Permission | Why |
| --- | --- |
| User.Read | Sign-in profile |
| User.Read.All | Read the signed-in person’s manager, direct reports, and one level under those reports |
| Mail.Send | Send the request, decision, and cancellation from the signed-in mailbox |
| Calendars.ReadWrite | Create the all-day event on the employee’s calendar. Add this only when a manager will turn calendar invites on. |
| openid, profile, email, offline_access | Sign-in and refresh tokens, requested as scopes |

`User.Read.All` needs an administrator. People also need the Manager field set in Entra. That field is the approver. This app does not keep a separate approver list.

Copy `.env.example` to `.env.local`:

```bash
AUTH_SECRET=replace-with-a-long-random-string
AUTH_URL=http://localhost:3847
AUTH_MICROSOFT_ENTRA_ID_ID=application-client-id
AUTH_MICROSOFT_ENTRA_ID_SECRET=client-secret-value
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=directory-tenant-id
ITOPS_EMAIL=itops@ttecdigital.com
ORG_TIMEZONE=America/Chicago
ORG_GRAPH_TIMEZONE=Central Standard Time
```

Restart the dev server. The sign-in page then offers **Sign in with Microsoft**. The sample directory hides unless `DEMO_MODE=true`.

`AUTH_URL` has to be the public origin of the app. It is used both for the OAuth redirect and for links inside the emails.

With calendar invites turned on, Graph creates one all-day event covering the whole date range. The end date sent to Graph is exclusive, which is what makes a single day render as one full day. The event is created on the employee’s calendar with show-as out of office, and IT Ops is a required attendee, so the invite goes to that mailbox. If the employee’s Microsoft session cannot be refreshed, the invite is sent from the approver’s calendar instead and the approver is not marked out of office. With the integration off, approval only emails the employee and records the decision.

Tokens are encrypted with `AUTH_SECRET` and stored in the local SQLite file. Set a real `AUTH_SECRET` before anyone other than you can reach the app. Microsoft sign-in stays off until that secret, the client id, the client secret, and the tenant id are all present.

## Data

Requests, people, and the message log live in `data/timeoff.db`. The file is created on first use and is not committed. Keep that file on a persistent disk if you run this somewhere other than a laptop. There is no separate hosted database.

## Scripts

- `npm run dev` starts the app on port 3847
- `npm test` runs the request, permission, mail, calendar, and component-updater checks
- `npm run lint` runs ESLint

## Components

**Components** lists Next.js, React, and the other libraries this app is built with. Time Off reads the latest stable release from the npm registry, then chooses the newest version the rest of the set still supports. Next.js and `eslint-config-next` stay on a release both packages publish. A package that has only published prereleases, such as Auth.js, stays on the newest prerelease.

A manager can choose **Update all** to install those releases into this checkout. A built deployment can show the comparison, and the install runs where `npm` can write `package.json`. Set `TIMEOFF_COMPONENT_UPDATES=0` to keep the check and skip the install.
