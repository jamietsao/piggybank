import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { appendTransaction, googleRequest, readSheet } from "@/lib/sheets";
import { validateTransaction } from "@/lib/transactions";

const connection = { googleSub: "child-one", displayName: "One", spreadsheetId: "sheet-one", sheetId: 0 };
const rows = [
  { values: ["Date", "Amount", "Balance", "Description"].map(formattedValue => ({ formattedValue })) },
  { values: [{ formattedValue: "10/1/26" }, { effectiveValue: { numberValue: 270 } }, { effectiveValue: { numberValue: 270 } }, { formattedValue: "Starting cash" }] },
];
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubEnv("ENABLE_SHEET_WRITES", "true"); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function successfulRead(title = "Kid's savings") {
  fetchMock.mockResolvedValueOnce(Response.json({ sheets: [{ properties: { sheetId: 0, title } }] }));
  fetchMock.mockResolvedValueOnce(Response.json({ sheets: [{ data: [{ rowData: rows }] }] }));
}

describe("Google Sheets integration", () => {
  it("resolves the configured tab from metadata and escapes its actual title", async () => {
    successfulRead();
    expect((await readSheet("token", connection)).balanceCents).toBe(27000);
    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.searchParams.get("ranges")).toBe("'Kid''s savings'!A:D");
  });
  it("fails when the configured tab no longer exists", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ sheets: [] }));
    await expect(readSheet("token", connection)).rejects.toMatchObject({ code: "SHEET_LAYOUT" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("checks the current balance before recording spending", async () => {
    successfulRead();
    await expect(appendTransaction("token", connection, validateTransaction({ action: "spend", amount: "300", description: "A purchase", date: "2026-10-10" }))).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not make a write when live writes are disabled", async () => {
    vi.stubEnv("ENABLE_SHEET_WRITES", "false");
    await expect(appendTransaction("token", connection, validateTransaction({ action: "add", amount: "5", description: "Gift", date: "2026-10-10" }))).rejects.toMatchObject({ code: "READ_ONLY" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("appends an entire entry once without overwriting existing rows", async () => {
    successfulRead(); fetchMock.mockResolvedValueOnce(Response.json({ replies: [{}] }));
    await appendTransaction("token", connection, validateTransaction({ action: "add", amount: "5.25", description: "Gift", date: "2026-10-10" }));
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe("https://sheets.googleapis.com/v4/spreadsheets/sheet-one:batchUpdate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body)).requests[0]).toHaveProperty("appendCells");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each([401, 403, 404])("turns Google HTTP %s into a reconnect/access error", async status => {
    fetchMock.mockResolvedValueOnce(new Response("", { status }));
    await expect(googleRequest("token", "https://sheets.googleapis.com/test")).rejects.toMatchObject({ code: status === 401 ? "RECONNECT" : "SHEET_ACCESS", uncertain: false });
  });
  it("does not retry an uncertain write", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network disconnected"));
    await expect(googleRequest("token", "https://sheets.googleapis.com/test", { method: "POST" }, true)).rejects.toMatchObject({ code: "SAVE_UNCERTAIN", uncertain: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("marks write-server errors and unreadable successful responses as uncertain", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(googleRequest("token", "https://sheets.googleapis.com/test", {}, true)).rejects.toMatchObject({ uncertain: true });
    fetchMock.mockResolvedValueOnce(new Response("broken JSON", { status: 200 }));
    await expect(googleRequest("token", "https://sheets.googleapis.com/test", {}, true)).rejects.toMatchObject({ uncertain: true });
  });
});
