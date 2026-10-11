import { requiredEnv, resolveSheetConnection } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { errorResponse, json, readJson, requireSameOrigin } from "@/lib/http";
import { requireGoogleSession } from "@/lib/session";
import { readSheet } from "@/lib/sheets";

export async function GET() {
  try {
    const session = await requireGoogleSession();
    return json({
      // Google Picker requires an access token in the browser. Refresh tokens
      // remain exclusively in the encrypted HttpOnly cookie/server code.
      pickerToken: session.accessToken,
      apiKey: requiredEnv("GOOGLE_PICKER_API_KEY"),
      appId: requiredEnv("GOOGLE_CLOUD_PROJECT_NUMBER"),
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireGoogleSession();
    const connection = resolveSheetConnection(session.googleSub);
    const selected = await readJson(request) as { spreadsheetId?: string };
    if (!selected || selected.spreadsheetId !== connection.spreadsheetId) throw new AppError("WRONG_SHEET", "Choose the piggybank spreadsheet connected to your account.", 422);
    // Selecting through Picker grants drive.file access; read back the selected
    // configured file before considering setup complete. No sheet is modified.
    await readSheet(session.accessToken, connection);
    return json({ connected: true });
  } catch (error) { return errorResponse(error); }
}
