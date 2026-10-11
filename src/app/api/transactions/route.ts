import { demoEnabled, resolveSheetConnection } from "@/lib/config";
import { appendDemo } from "@/lib/demo";
import { requireGoogleSession } from "@/lib/session";
import { appendTransaction } from "@/lib/sheets";
import { errorResponse, json, readJson, requireSameOrigin } from "@/lib/http";
import { validateTransaction } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const transaction = validateTransaction(await readJson(request));
    if (demoEnabled()) { appendDemo(transaction); return json({ saved: true }); }
    const session = await requireGoogleSession();
    await appendTransaction(session.accessToken, resolveSheetConnection(session.googleSub), transaction);
    // A successful write stays successful even if a subsequent refresh fails.
    return json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
