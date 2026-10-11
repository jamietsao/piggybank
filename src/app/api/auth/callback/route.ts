import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { appUrl, isAllowedAccount, requiredEnv, resolveSheetConnection } from "@/lib/config";
import { googleClient, oauthSession, userSession } from "@/lib/session";

export async function GET(request: Request) {
  const destination = new URL("/", appUrl());
  const oauth = await oauthSession();
  const query = new URL(request.url).searchParams;
  const state = query.get("state") || "";
  const expected = oauth.state || "";
  if (!expected || Buffer.byteLength(state) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)) || !oauth.verifier || !oauth.nonce || !oauth.expiresAt || oauth.expiresAt < Date.now()) {
    destination.searchParams.set("signin", "expired");
    return NextResponse.redirect(destination);
  }
  const verifier = oauth.verifier;
  const nonce = oauth.nonce;
  // Consume the authorization attempt before exchanging its single-use code.
  delete oauth.state;
  delete oauth.verifier;
  delete oauth.nonce;
  delete oauth.expiresAt;
  await oauth.save();
  if (query.has("error") || !query.get("code")) {
    oauth.error = "Google sign-in was cancelled or access was not granted. A parent may need to approve this app in Family Link.";
    await oauth.save();
    return NextResponse.redirect(destination);
  }
  try {
    const client = googleClient();
    const { tokens } = await client.getToken({ code: query.get("code")!, codeVerifier: verifier, redirect_uri: `${appUrl()}/api/auth/callback` });
    if (!tokens.id_token || !tokens.access_token) throw new Error("Incomplete credentials");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: requiredEnv("GOOGLE_CLIENT_ID") });
    const identity = ticket.getPayload();
    if (!identity?.sub || (identity as unknown as { nonce?: string }).nonce !== nonce) throw new Error("Invalid identity");
    if (!isAllowedAccount(identity.sub)) {
      oauth.setupSubject = identity.sub;
      oauth.error = "This Google account is not connected yet. A parent can use the account ID below to finish setup.";
      await oauth.save();
      return NextResponse.redirect(destination);
    }
    if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/drive.file")) throw new Error("File scope missing");
    const session = await userSession();
    const previousRefresh = session.googleSub === identity.sub ? session.refreshToken : undefined;
    session.googleSub = identity.sub;
    session.name = resolveSheetConnection(identity.sub).displayName;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token || previousRefresh;
    session.accessExpiresAt = tokens.expiry_date || Date.now() + 3_600_000;
    await session.save();
    oauth.destroy();
  } catch {
    oauth.error = "Google could not finish connecting your account. Try signing in again. If Family Link blocks access, ask a parent to review the app permissions.";
    await oauth.save();
  }
  return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store" } });
}
