import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { demoEnabled, familyMembers, isAllowedAccount, resolveSheetConnection } from "@/lib/config";

afterEach(() => vi.unstubAllEnvs());
const members = [{ googleSub: "child-one", displayName: "One", spreadsheetId: "sheet-one", sheetId: 0 }, { googleSub: "child-two", displayName: "Two", spreadsheetId: "sheet-two", sheetId: 7 }];

describe("account admission and sheet resolution", () => {
  it("keeps each account isolated and rejects unknown identities", () => {
    vi.stubEnv("FAMILY_MEMBERS", JSON.stringify(members));
    expect(isAllowedAccount("unknown")).toBe(false);
    expect(resolveSheetConnection("child-two").spreadsheetId).toBe("sheet-two");
    expect(() => resolveSheetConnection("unknown")).toThrow("not connected");
  });
  it("fails closed on ambiguous or malformed configuration", () => {
    vi.stubEnv("FAMILY_MEMBERS", JSON.stringify([members[0], members[0]]));
    expect(() => familyMembers()).toThrow("exactly one");
    vi.stubEnv("FAMILY_MEMBERS", "broken JSON");
    expect(() => familyMembers()).toThrow("configuration");
    vi.stubEnv("FAMILY_MEMBERS", JSON.stringify([{ ...members[0], sheetId: -1 }]));
    expect(() => familyMembers()).toThrow("configuration");
  });
  it("cannot enable the demo authentication bypass in production", () => {
    vi.stubEnv("DEV_DEMO_MODE", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(demoEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(demoEnabled()).toBe(true);
  });
});
