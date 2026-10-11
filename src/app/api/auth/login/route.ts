import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "@/lib/config";
import { googleClient, oauthSession } from "@/lib/session";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const session = await oauthSession();
    session.state = randomBytes(32).toString("base64url");
    session.nonce = randomBytes(32).toString("base64url");
    session.verifier = randomBytes(48).toString("base64url");
    session.expiresAt = Date.now() + 600_000;
    delete session.setupSubject;
    delete session.error;
    await session.save();
    const url = googleClient().generateAuthUrl({
      access_type: "offline", prompt: "consent select_account",
      scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"],
      state: session.state, include_granted_scopes: true,
    });
    const destination = new URL(url);
    destination.searchParams.set("nonce", session.nonce);
    destination.searchParams.set("code_challenge", createHash("sha256").update(session.verifier).digest("base64url"));
    destination.searchParams.set("code_challenge_method", "S256");
    return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Keep setup errors on the app screen rather than showing an API response.
    if (process.env.SESSION_SECRET) return NextResponse.redirect(new URL("/?signin=configuration", appUrl()));
    return errorResponse(error);
  }
}
