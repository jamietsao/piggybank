import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { oauth, user, client } = vi.hoisted(() => ({
  oauth: { state: "expected-state", nonce: "nonce", verifier: "verifier", expiresAt: 0, save: vi.fn(), destroy: vi.fn(), error: undefined as string | undefined, setupSubject: undefined as string | undefined },
  user: { save: vi.fn(), destroy: vi.fn() },
  client: { getToken: vi.fn(), verifyIdToken: vi.fn() },
}));
vi.mock("@/lib/session", () => ({ oauthSession: async () => oauth, userSession: async () => user, googleClient: () => client }));
import { GET } from "@/app/api/auth/callback/route";

beforeEach(() => {
  vi.stubEnv("APP_URL", "http://localhost:3000"); vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("FAMILY_MEMBERS", JSON.stringify([{ googleSub: "child", displayName: "Child", spreadsheetId: "file", sheetId: 0 }]));
  Object.assign(oauth, { state: "expected-state", nonce: "nonce", verifier: "verifier", expiresAt: Date.now() + 600_000, error: undefined, setupSubject: undefined });
  client.getToken.mockResolvedValue({ tokens: { id_token: "identity", access_token: "access", refresh_token: "refresh", scope: "openid https://www.googleapis.com/auth/drive.file", expiry_date: Date.now() + 3_600_000 } });
  client.verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "child", nonce: "nonce" }) });
});
afterEach(() => vi.unstubAllEnvs());
describe("OAuth callback", () => {
  it.each(["wrong-state", "éééééééééééééé"])("rejects mismatched state without exchanging credentials: %s", state => {
    return GET(new Request(`http://localhost:3000/api/auth/callback?state=${encodeURIComponent(state)}&code=code`)).then(response => {
      expect(response.headers.get("Location")).toContain("signin=expired");
      expect(client.getToken).not.toHaveBeenCalled();
    });
  });
  it("rejects a valid Google identity with the wrong nonce", async () => {
    client.verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "child", nonce: "wrong" }) });
    await GET(new Request("http://localhost:3000/api/auth/callback?state=expected-state&code=code"));
    expect(user.save).not.toHaveBeenCalled();
    expect(oauth.error).toContain("could not finish");
  });
  it("exposes only the verified account ID for setup and does not sign in an unconfigured account", async () => {
    client.verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "unknown-child", nonce: "nonce" }) });
    await GET(new Request("http://localhost:3000/api/auth/callback?state=expected-state&code=code"));
    expect(oauth.setupSubject).toBe("unknown-child");
    expect(user.save).not.toHaveBeenCalled();
  });
  it("creates a session only after identity, state, nonce, allowlist, and file scope checks", async () => {
    await GET(new Request("http://localhost:3000/api/auth/callback?state=expected-state&code=code"));
    expect(client.getToken).toHaveBeenCalledWith({ code: "code", codeVerifier: "verifier", redirect_uri: "http://localhost:3000/api/auth/callback" });
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(oauth.destroy).toHaveBeenCalledTimes(1);
    expect(oauth.state).toBeUndefined();
  });
  it("rejects missing spreadsheet scope", async () => {
    client.getToken.mockResolvedValue({ tokens: { id_token: "identity", access_token: "access", scope: "openid" } });
    await GET(new Request("http://localhost:3000/api/auth/callback?state=expected-state&code=code"));
    expect(user.save).not.toHaveBeenCalled();
  });
});
