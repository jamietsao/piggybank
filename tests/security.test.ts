import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readJson, requireSameOrigin } from "@/lib/http";
import { sealData, unsealData } from "iron-session";

afterEach(() => vi.unstubAllEnvs());
describe("request and session boundaries", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "http://localhost:3000"));
  it("rejects cross-site and missing-origin mutations", () => {
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api/transactions", { headers: { Origin: "https://other.example" } }))).toThrow("Reload");
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api/transactions"))).toThrow("Reload");
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api/transactions", { headers: { Origin: "http://localhost:3000" } }))).not.toThrow();
  });
  it("rejects invalid JSON and oversized bodies", async () => {
    await expect(readJson(new Request("http://localhost:3000", { method: "POST", headers: { "Content-Type": "application/json" }, body: "not JSON" }))).rejects.toThrow("entry");
    await expect(readJson(new Request("http://localhost:3000", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "x".repeat(10001) }) }))).rejects.toMatchObject({ status: 413 });
  });
  it("encrypts token data and rejects a seal authenticated by a different password", async () => {
    const password = "a".repeat(40);
    const sealed = await sealData({ refreshToken: "private-token" }, { password, ttl: 600 });
    expect(sealed).not.toContain("private-token");
    expect(await unsealData(sealed, { password, ttl: 600 })).toEqual({ refreshToken: "private-token" });
    expect(await unsealData(sealed, { password: "b".repeat(40), ttl: 600 })).toEqual({});
  });
});
