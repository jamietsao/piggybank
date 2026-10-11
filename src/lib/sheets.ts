import "server-only";
import type { SheetConnection } from "./config";
import { writesEnabled } from "./config";
import { AppError } from "./errors";
import { parseLedger, type Cell } from "./ledger";
import { buildAppendRequest, requireConfirmation, type ValidatedTransaction } from "./transactions";

export async function googleRequest<T>(token: string, url: string, init: RequestInit = {}, writing = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
  } catch {
    throw new AppError(writing ? "SAVE_UNCERTAIN" : "GOOGLE_UNAVAILABLE", writing ? "We could not confirm whether this entry saved. Refresh and check the history before trying again." : "Could not reach Google Sheets. Check your connection and try again.", 503, writing);
  }
  if (!response.ok) {
    if (response.status === 401) throw new AppError("RECONNECT", "Reconnect your Google account to continue.", 401);
    if (response.status === 403 || response.status === 404) throw new AppError("SHEET_ACCESS", "Google could not open your connected sheet. Choose it again to grant access, or ask a parent to check its permissions.", 403);
    throw new AppError(writing && response.status >= 500 ? "SAVE_UNCERTAIN" : "GOOGLE_UNAVAILABLE", writing && response.status >= 500 ? "We could not confirm whether this entry saved. Refresh and check the history before trying again." : "Google could not complete this request. Try again shortly.", 503, writing && response.status >= 500);
  }
  try { return await response.json() as T; }
  catch { throw new AppError(writing ? "SAVE_UNCERTAIN" : "GOOGLE_UNAVAILABLE", writing ? "Check the history before retrying this entry; the save could not be confirmed." : "Google returned an unreadable response. Try again.", 503, writing); }
}

export async function readSheet(token: string, connection: SheetConnection) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(connection.spreadsheetId)}`;
  const metadata = await googleRequest<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(token, `${base}?fields=sheets.properties(sheetId,title)`);
  const tab = metadata.sheets?.find(sheet => sheet.properties.sheetId === connection.sheetId);
  if (!tab) throw new AppError("SHEET_LAYOUT", "The connected spreadsheet tab no longer exists. Ask a parent to update the connection.", 422);
  const range = `'${tab.properties.title.replaceAll("'", "''")}'!A:D`;
  const query = new URLSearchParams({ ranges: range, includeGridData: "true", fields: "sheets(data(startRow,rowData(values(formattedValue,effectiveValue,userEnteredValue))))" });
  const result = await googleRequest<{ sheets?: { data?: { startRow?: number; rowData?: { values?: Cell[] }[] }[] }[] }>(token, `${base}?${query}`);
  return parseLedger(result.sheets?.[0]?.data?.[0]?.rowData || [], writesEnabled());
}

export async function appendTransaction(token: string, connection: SheetConnection, transaction: ValidatedTransaction) {
  if (!writesEnabled()) throw new AppError("READ_ONLY", "Saving is not enabled yet. A parent needs to finish the Google access check first.", 403);
  const ledger = await readSheet(token, connection);
  if (!ledger.canWrite || ledger.balanceCents === null) throw new AppError("INVALID_BALANCE", ledger.problem || "Repair the sheet balance before saving.", 422);
  requireConfirmation(transaction, ledger.balanceCents);
  // appendCells chooses the row on Google's server. The formula refers to its own
  // row, so simultaneous appends never overwrite or use a stale row number.
  await googleRequest(token, `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(connection.spreadsheetId)}:batchUpdate`, { method: "POST", body: JSON.stringify(buildAppendRequest(connection.sheetId, transaction)) }, true);
}
