import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "@/lib/money";
import { buildAppendRequest, dateSerial, requireConfirmation, validateTransaction } from "@/lib/transactions";

const entry = { action: "add", amount: "0.10", description: "A gift", date: "2026-10-10" };

describe("cash entries", () => {
  it("calculates cents without floating-point addition errors", () => {
    expect(parseMoney("0.10") + parseMoney("0.20")).toBe(30);
    expect(parseMoney("12.5")).toBe(1250);
    expect(formatMoney(-1250)).toBe("-$12.50");
  });
  it.each(["-1", "0", "1.001", "1e3", "NaN", "Infinity", "1000000", "1,000", "1.", "", ".5"])("rejects invalid amount %s", amount => {
    expect(() => validateTransaction({ ...entry, amount })).toThrow();
  });
  it("allows a zero-dollar recount and supplies a default note", () => {
    expect(validateTransaction({ ...entry, action: "recount", amount: "0", description: "" })).toMatchObject({ cents: 0, description: "Recounted cash" });
  });
  it.each(["2026-02-30", "2026-2-3", "2026-13-01", "banana", "1899-12-31"])("rejects invalid date %s", date => {
    expect(() => validateTransaction({ ...entry, date })).toThrow("valid date");
  });
  it("accepts a leap day and keeps it a calendar date", () => {
    expect(validateTransaction({ ...entry, date: "2024-02-29" }).date).toBe("2024-02-29");
    expect(dateSerial("2022-07-23")).toBe(44765);
  });
  it("requires descriptions and does not truncate them silently", () => {
    expect(() => validateTransaction({ ...entry, description: "   " })).toThrow("description");
    expect(() => validateTransaction({ ...entry, description: "x".repeat(501) })).toThrow("description");
  });
  it("requires explicit confirmation for overspending and repeats it when the balance changed", () => {
    const spend = validateTransaction({ ...entry, action: "spend", amount: "300" });
    expect(() => requireConfirmation(spend, 27000)).toThrow("confirm");
    expect(() => requireConfirmation({ ...spend, confirmed: true, expectedBalanceCents: 27000 }, 27000)).not.toThrow();
    expect(() => requireConfirmation({ ...spend, confirmed: true, expectedBalanceCents: 27000 }, 25000)).toThrow("confirm");
    expect(() => requireConfirmation(spend, 40000)).not.toThrow();
  });
  it("requires confirmation for every recount, including zero", () => {
    const recount = validateTransaction({ ...entry, action: "recount", amount: "0" });
    expect(() => requireConfirmation(recount, 27000)).toThrow("confirm");
  });
  it("writes descriptions literally and the full row in a single server-assigned append", () => {
    const request = buildAppendRequest(17, validateTransaction({ ...entry, action: "spend", amount: "12.34", description: "=SUM(A1:A4)" }));
    const append = request.requests[0].appendCells;
    expect(append.sheetId).toBe(17);
    const values = append.rows[0].values;
    expect(values[0].userEnteredValue).toEqual({ numberValue: dateSerial("2026-10-10") });
    expect(values[1].userEnteredValue).toEqual({ numberValue: -12.34 });
    expect(values[2].userEnteredValue).toEqual({ formulaValue: "=INDEX(C:C,ROW()-1)+INDEX(B:B,ROW())" });
    expect(values[3].userEnteredValue).toEqual({ stringValue: "=SUM(A1:A4)" });
    expect(request.requests).toHaveLength(1);
  });
  it("writes recounts as a balance reset with a blank amount", () => {
    const values = buildAppendRequest(0, validateTransaction({ ...entry, action: "recount", amount: "42.17" })).requests[0].appendCells.rows[0].values;
    expect(values[1]).toEqual({});
    expect(values[2].userEnteredValue).toEqual({ numberValue: 42.17 });
    expect(values[3].userEnteredValue).toEqual({ stringValue: "A gift" });
  });
});
