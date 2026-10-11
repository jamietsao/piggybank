import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config";
import { requireSameOrigin, errorResponse } from "@/lib/http";
import { oauthSession, userSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    (await userSession()).destroy();
    (await oauthSession()).destroy();
    return NextResponse.redirect(new URL("/", appUrl()), 303);
  } catch (error) { return errorResponse(error); }
}
