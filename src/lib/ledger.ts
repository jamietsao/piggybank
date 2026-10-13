import type { Ledger, LedgerEntry } from "./types";
import { AppError } from "./errors";

export type Cell = {
  formattedValue?: string;
  effectiveValue?: { numberValue?: number; stringValue?: string; errorValue?: { type?: string; message?: string } };
  userEnteredValue?: { numberValue?: number; stringValue?: string; formulaValue?: string };
};

export function cellCents(cell: Cell | undefined): number | null {
  const number = cell?.effectiveValue?.numberValue;
  if (typeof number !== "number" || !Number.isFinite(number)) return null;
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function text(cell: Cell | undefined): string { return cell?.formattedValue ?? cell?.effectiveValue?.stringValue ?? ""; }
function populated(cell: Cell): boolean { return cell.effectiveValue !== undefined || cell.userEnteredValue !== undefined || Boolean(cell.formattedValue); }

export function parseLedger(rows: { values?: Cell[] }[], writesAllowed = true): Ledger {
  const headers = rows[0]?.values || [];
  const names = headers.slice(0, 4).map(header => text(header).trim().toLowerCase());
  if (["date", "amount", "balance"].some((header, index) => names[index] !== header) || !["description", "notes"].includes(names[3] || "")) {
    throw new AppError("SHEET_LAYOUT", "The connected sheet needs Date, Amount, Balance, and Description in columns A–D (Notes is also accepted for column D).", 422);
  }
  const entries: LedgerEntry[] = [];
  rows.slice(1).forEach((row, index) => {
    const cells = (row.values || []).slice(0, 4);
    if (!cells.some(populated)) return;
    const amountCents = cellCents(cells[1]);
    const balanceCents = cellCents(cells[2]);
    entries.push({ row: index + 2, date: text(cells[0]), description: text(cells[3]), amountCents, balanceCents, kind: amountCents === null ? "recount" : amountCents < 0 ? "spend" : "add" });
  });
  const balanceCents = entries.length ? entries[entries.length - 1].balanceCents : null;
  const problem = balanceCents === null ? "The latest row has no valid balance. Ask a parent to repair it in Google Sheets, then refresh." : null;
  return { balanceCents, entries: entries.reverse(), canWrite: writesAllowed && !problem, problem };
}
