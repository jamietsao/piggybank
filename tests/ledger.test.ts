import { describe, expect, it } from "vitest";
import { parseLedger, type Cell } from "@/lib/ledger";
import balances from "./fixtures/reference-balances.json";
import notesBalances from "./fixtures/notes-ledger-balances.json";

const cell = (value: string | number): Cell => typeof value === "number" ? { effectiveValue: { numberValue: value }, formattedValue: String(value) } : { effectiveValue: { stringValue: value }, formattedValue: value };
export const headers = { values: ["Date", "Amount", "Balance", "Description"].map(cell) };
export const ledgerRows = [headers, { values: [cell("10/1/26"), cell(270), cell(270), cell("Opening balance")] }];

describe("spreadsheet ledger compatibility", () => {
  it("reads all 96 reference rows and uses the $270 balance after historical recounts", () => {
    const rows = [headers, ...balances.map(([amount, balance], index) => ({ values: [cell(index === 37 ? "6/25//23" : index === 49 ? "3/25/24–3/28/24" : "7/23/22"), amount === null ? {} : cell(amount / 100), cell(balance! / 100), cell(`Entry ${index + 1}`)] }))];
    const ledger = parseLedger(rows);
    expect(ledger.entries).toHaveLength(96);
    expect(ledger.balanceCents).toBe(27000);
    expect(ledger.entries[0].row).toBe(97);
    expect(ledger.entries.find(entry => entry.row === 23)).toMatchObject({ amountCents: null, balanceCents: 42000, kind: "recount" });
    expect(ledger.entries.find(entry => entry.row === 39)?.date).toBe("6/25//23");
    expect(ledger.entries.find(entry => entry.row === 51)?.date).toBe("3/25/24–3/28/24");
    expect(balances.reduce((sum, [amount]) => sum + (amount || 0), 0)).not.toBe(ledger.balanceCents);
  });
  it("reads the supplied Notes ledger with its leading blank row and balance-only rows", () => {
    const notesHeaders = { values: ["Date", "Amount", "Balance", "Notes"].map(cell) };
    const rows = [notesHeaders, ...notesBalances.map(([amount, balance], index) => ({ values: amount === null && balance === null ? [] : [cell("10/1/26"), amount === null ? {} : cell(amount / 100), balance === null ? {} : cell(balance / 100), cell(`Example note ${index + 1}`)] }))];
    const ledger = parseLedger(rows, false);
    expect(ledger).toMatchObject({ balanceCents: 18700, canWrite: false, problem: null });
    expect(ledger.entries).toHaveLength(218);
    expect(ledger.entries[0]).toMatchObject({ row: 220, amountCents: null, balanceCents: 18700, kind: "recount" });
    expect(ledger.entries.at(-1)).toMatchObject({ row: 3, amountCents: 2169, balanceCents: 2169, description: "Example note 2" });
  });
  it("ignores trailing formatting and empty rows", () => {
    expect(parseLedger([...ledgerRows, { values: [{}, {}, {}] }]).balanceCents).toBe(27000);
  });
  it.each([
    { values: [cell("10/2/26"), cell(-2), {}, cell("Pending")] },
    { values: [cell("10/2/26"), cell(-2), { effectiveValue: { errorValue: { type: "REF" } } }, cell("Broken formula")] },
  ])("blocks writes instead of silently using an older valid balance", row => {
    expect(parseLedger([...ledgerRows, row])).toMatchObject({ balanceCents: null, canWrite: false });
  });
  it("requires the expected columns and an opening balance", () => {
    expect(() => parseLedger([{ values: [cell("Date"), cell("Amount"), cell("Description")] }])).toThrow("columns A–D");
    expect(parseLedger([headers])).toMatchObject({ balanceCents: null, canWrite: false });
  });
  it("rejects the previous column order instead of reading notes as money", () => {
    expect(() => parseLedger([{ values: ["Date", "Description", "Amount", "Balance"].map(cell) }])).toThrow("Date, Amount, Balance, and Description");
  });
  it("accepts Notes as the column-D label without changing amounts, balance, or description", () => {
    const aliasHeaders = { values: [" date ", " AMOUNT ", "Balance", " NOTES "].map(cell) };
    expect(parseLedger([aliasHeaders, ...ledgerRows.slice(1)], false)).toMatchObject({
      balanceCents: 27000, canWrite: false, problem: null,
      entries: [{ amountCents: 27000, balanceCents: 27000, description: "Opening balance" }],
    });
  });
  it("supports read-only configuration without losing the current balance", () => {
    expect(parseLedger(ledgerRows, false)).toMatchObject({ balanceCents: 27000, canWrite: false, problem: null });
  });
});
