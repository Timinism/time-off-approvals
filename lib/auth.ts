import NextAuth from "next-auth";
import MicrosoftEntraID, {
  type MicrosoftEntraIDProfile,
} from "next-auth/providers/microsoft-entra-id";
import { appSecret, entraSettings, graphScopes } from "./config";
import { upsertIdentity } from "./repo";
import { storeInitialTokens } from "./tokens";

const settings = entraSettings();

export const entraConfigured = settings.configured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: appSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/sign-in" },
  providers: settings.configured
    ? [
        MicrosoftEntraID({
          clientId: settings.clientId,
          clientSecret: settings.clientSecret,
          issuer: settings.issuer ?? undefined,
          authorization: {
            params: {
              scope: graphScopes(false),
              prompt: "select_account",
            },
          },
          profile(profile) {
            const email = profile.email || profile.preferred_username;
            return {
              id: profile.oid,
              name: profile.name || email,
              email,
              image: null,
            };
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account) {
        const raw = profile as MicrosoftEntraIDProfile | undefined;
        const id = raw?.oid || user?.id;
        const email = raw?.email || raw?.preferred_username || user?.email || "";
        const name = raw?.name || user?.name || email || "Signed-in user";
        if (id && email) {
          upsertIdentity({ id, email, name });
          storeInitialTokens(id, {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: typeof account.expires_at === "number" ? account.expires_at : null,
          });
          token.oid = id;
          token.sub = id;
          token.email = email;
          token.name = name;
        }
      }
      delete token.picture;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string") session.user.id = token.sub;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
});
