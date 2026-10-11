import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({}) }));
const { session } = vi.hoisted(() => ({ session: { googleSub: "child", accessToken: "access", refreshToken: "refresh", accessExpiresAt: 0, save: vi.fn(), destroy: vi.fn() } }));
vi.mock("iron-session", () => ({ getIronSession: async () => session }));
import { requireGoogleSession } from "@/lib/session";

beforeEach(() => {
  vi.stubEnv("FAMILY_MEMBERS", JSON.stringify([{ googleSub: "child", displayName: "Child", spreadsheetId: "file", sheetId: 0 }]));
  vi.stubEnv("SESSION_SECRET", "a".repeat(40)); vi.stubEnv("GOOGLE_CLIENT_ID", "id"); vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret"); vi.stubEnv("APP_URL", "http://localhost:3000");
  Object.assign(session, { googleSub: "child", accessToken: "access", refreshToken: "refresh", accessExpiresAt: Date.now() + 3_600_000 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Google session refresh", () => {
  it("rejects accounts removed from the allowlist", async () => {
    session.googleSub = "another-child";
    await expect(requireGoogleSession()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("refreshes expiring tokens on the server and saves the encrypted session", async () => {
    session.accessExpiresAt = 0;
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ access_token: "new-access", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);
    const refreshed = await requireGoogleSession();
    expect(refreshed.accessToken).toBe("new-access");
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("grant_type=refresh_token");
  });
  it("requests reconnection and destroys a revoked session", async () => {
    session.accessExpiresAt = 0;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 400 })));
    await expect(requireGoogleSession()).rejects.toMatchObject({ code: "RECONNECT" });
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });
  it("preserves the session during a temporary Google outage", async () => {
    session.accessExpiresAt = 0;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));
    await expect(requireGoogleSession()).rejects.toMatchObject({ code: "GOOGLE_UNAVAILABLE" });
    expect(session.destroy).not.toHaveBeenCalled();
  });
});
