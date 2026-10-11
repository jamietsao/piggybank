import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { readSheet, appendTransaction, requireGoogleSession } = vi.hoisted(() => ({ readSheet: vi.fn(), appendTransaction: vi.fn(), requireGoogleSession: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireGoogleSession }));
vi.mock("@/lib/sheets", () => ({ readSheet, appendTransaction }));
import { POST as postTransaction } from "@/app/api/transactions/route";
import { POST as connectSheet } from "@/app/api/connection/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("DEV_DEMO_MODE", "false"); vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("FAMILY_MEMBERS", JSON.stringify([{ googleSub: "child", displayName: "Child", spreadsheetId: "configured-sheet", sheetId: 7 }]));
  requireGoogleSession.mockResolvedValue({ googleSub: "child", accessToken: "access" });
  appendTransaction.mockResolvedValue(undefined); readSheet.mockResolvedValue({ balanceCents: 27000 });
});
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/transactions", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("authenticated mutation endpoints", () => {
  it("ignores a supplied file target and uses only the signed-in account's connection", async () => {
    const response = await postTransaction(request({ action: "add", amount: "5", description: "Gift", date: "2026-10-10", spreadsheetId: "another-childs-sheet" }));
    expect(response.status).toBe(200);
    expect(appendTransaction.mock.calls[0][1]).toMatchObject({ spreadsheetId: "configured-sheet", sheetId: 7 });
  });
  it("rejects a wrong Picker selection before reading the file", async () => {
    const response = await connectSheet(request({ spreadsheetId: "another-childs-sheet" }));
    expect(response.status).toBe(422);
    expect(readSheet).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes before invoking Google", async () => {
    expect((await postTransaction(request({}, "https://attacker.example"))).status).toBe(403);
    expect(appendTransaction).not.toHaveBeenCalled();
  });
  it("does not confuse a confirmed save with a later refresh failure", async () => {
    readSheet.mockRejectedValue(new Error("Google outage"));
    expect(await (await postTransaction(request({ action: "add", amount: "5", description: "Gift", date: "2026-10-10" }))).json()).toEqual({ saved: true });
    expect(readSheet).not.toHaveBeenCalled();
  });
});
