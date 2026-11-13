import { appSecret, entraSettings, graphScopes, tenantIdFromIssuer } from "./config";
import { calendarIntegrationEnabled } from "./settings";
import { decryptSecret, encryptSecret } from "./crypto";
import { explainGraphFailure } from "./graph";
import { getPerson, saveTokens } from "./repo";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const settings = entraSettings();
  if (!settings.configured || !settings.issuer || !settings.tenantId) {
    throw new Error("Microsoft Entra ID is not configured, so Time Off cannot refresh a sign-in.");
  }
  const tenant = tenantIdFromIssuer(settings.issuer) || settings.tenantId;
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: graphScopes(calendarIntegrationEnabled()),
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Microsoft did not refresh the sign-in.");
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
  };
}

export async function getAccessToken(userId: string): Promise<string> {
  const person = getPerson(userId);
  if (!person) {
    throw new Error("That person has not signed in to Time Off yet.");
  }
  if (person.isDemo) {
    throw new Error("Demo people do not have Microsoft mailboxes.");
  }
  const secret = appSecret();
  const fresh =
    person.accessTokenEnc &&
    person.tokenExpiresAt &&
    person.tokenExpiresAt * 1000 > Date.now() + 60_000;
  if (fresh && person.accessTokenEnc) {
    return decryptSecret(person.accessTokenEnc, secret);
  }
  if (!person.refreshTokenEnc) {
    throw new Error(`${person.name} needs to sign in to Time Off again before mail can be sent.`);
  }
  try {
    const refreshed = await refreshAccessToken(decryptSecret(person.refreshTokenEnc, secret));
    saveTokens(userId, {
      accessToken: encryptSecret(refreshed.accessToken, secret),
      refreshToken: encryptSecret(refreshed.refreshToken, secret),
      expiresAt: refreshed.expiresAt,
    });
    return refreshed.accessToken;
  } catch (error) {
    throw new Error(explainGraphFailure(error, `send mail for ${person.name}`));
  }
}

export function storeInitialTokens(
  userId: string,
  tokens: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null },
) {
  const secret = appSecret();
  saveTokens(userId, {
    accessToken: tokens.accessToken ? encryptSecret(tokens.accessToken, secret) : tokens.accessToken,
    refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken, secret) : tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });
}
