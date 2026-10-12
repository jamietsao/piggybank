import { demoEnabled, resolveSheetConnection } from "@/lib/config";
import { readDemo } from "@/lib/demo";
import { requireGoogleSession } from "@/lib/session";
import { readSheet } from "@/lib/sheets";
import { errorResponse, json } from "@/lib/http";

export async function GET() {
  try {
    if (demoEnabled()) return json(readDemo());
    const session = await requireGoogleSession();
    return json(await readSheet(session.accessToken, resolveSheetConnection(session.googleSub)));
  } catch (error) { return errorResponse(error); }
}
