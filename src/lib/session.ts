import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { OAuth2Client } from "google-auth-library";
import { appUrl, isAllowedAccount, requiredEnv } from "./config";
import { AppError } from "./errors";

type UserSession = {
  googleSub?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  accessExpiresAt?: number;
};
type OAuthSession = { state?: string; verifier?: string; nonce?: string; expiresAt?: number; setupSubject?: string; error?: string };

function options(cookieName: string, ttl: number) {
  return { cookieName, password: requiredEnv("SESSION_SECRET"), ttl, cookieOptions: { secure: appUrl().startsWith("https:"), httpOnly: true, sameSite: "lax" as const, path: "/" } };
}

export async function userSession() { return getIronSession<UserSession>(await cookies(), options("pb_session", 60 * 60 * 24 * 30)); }
export async function oauthSession() { return getIronSession<OAuthSession>(await cookies(), options("pb_oauth", 600)); }

export function googleClient() {
  return new OAuth2Client(requiredEnv("GOOGLE_CLIENT_ID"), requiredEnv("GOOGLE_CLIENT_SECRET"), `${appUrl()}/api/auth/callback`);
}

export async function requireGoogleSession() {
  const session = await userSession();
  if (!session.googleSub || !session.accessToken || !isAllowedAccount(session.googleSub)) throw new AppError("UNAUTHENTICATED", "Sign in with your Google account to continue.", 401);
  if (!session.accessExpiresAt || session.accessExpiresAt < Date.now() + 60_000) {
    if (!session.refreshToken) throw new AppError("RECONNECT", "Reconnect your Google account to continue.", 401);
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: requiredEnv("GOOGLE_CLIENT_ID"), client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"), refresh_token: session.refreshToken, grant_type: "refresh_token" }),
      });
      if (!response.ok) {
        if (response.status >= 500) throw new AppError("GOOGLE_UNAVAILABLE", "Google is unavailable right now. Try again shortly.", 503);
        session.destroy();
        throw new AppError("RECONNECT", "Reconnect your Google account to continue.", 401);
      }
      const token = await response.json();
      if (typeof token.access_token !== "string" || typeof token.expires_in !== "number") throw new Error("Invalid token response");
      session.accessToken = token.access_token;
      session.accessExpiresAt = Date.now() + token.expires_in * 1000;
      await session.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("GOOGLE_UNAVAILABLE", "Could not reconnect to Google. Try again shortly.", 503);
    }
  }
  return session as typeof session & { googleSub: string; accessToken: string };
}
