import { AppError } from "./errors";
import { parseMoney } from "./money";
import type { Action } from "./types";

export type ValidatedTransaction = {
  action: Action;
  cents: number;
  description: string;
  date: string;
  confirmed: boolean;
  expectedBalanceCents?: number;
};

export function validateTransaction(input: unknown): ValidatedTransaction {
  if (!input || typeof input !== "object") throw new AppError("INVALID_INPUT", "Check your entry and try again.");
  const value = input as Record<string, unknown>;
  if (!["add", "spend", "recount"].includes(String(value.action))) throw new AppError("INVALID_ACTION", "Choose how your money changed.");
  const action = value.action as Action;
  const cents = parseMoney(value.amount, action === "recount");
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if ((!description && action !== "recount") || description.length > 500) {
    throw new AppError("INVALID_DESCRIPTION", "Add a description of up to 500 characters.");
  }
  const date = typeof value.date === "string" ? value.date : "";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < "1900-01-01" || date > "9999-12-31") {
    throw new AppError("INVALID_DATE", "Choose a valid date.");
  }
  if (value.expectedBalanceCents !== undefined && !Number.isSafeInteger(value.expectedBalanceCents)) {
    throw new AppError("INVALID_INPUT", "Refresh your balance and try again.");
  }
  return { action, cents, description: description || "Recounted cash", date, confirmed: value.confirmed === true, expectedBalanceCents: value.expectedBalanceCents as number | undefined };
}

export function requireConfirmation(transaction: ValidatedTransaction, balanceCents: number): void {
  const needsConfirmation = transaction.action === "recount" || (transaction.action === "spend" && balanceCents - transaction.cents < 0);
  if (needsConfirmation && (!transaction.confirmed || transaction.expectedBalanceCents !== balanceCents)) {
    throw new AppError("CONFIRMATION_REQUIRED", "Your balance may have changed. Review the updated balance and confirm this entry.", 409);
  }
}

// Date serials are calendar dates; UTC avoids shifting dates on phones in other zones.
export function dateSerial(date: string): number {
  return (Date.parse(`${date}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

export function buildAppendRequest(sheetId: number, transaction: ValidatedTransaction) {
  const moneyFormat = { numberFormat: { type: "CURRENCY", pattern: '"$"#,##0.00;[Red]-"$"#,##0.00' } };
  return {
    requests: [{ appendCells: {
      sheetId,
      rows: [{ values: [
        { userEnteredValue: { numberValue: dateSerial(transaction.date) }, userEnteredFormat: { numberFormat: { type: "DATE", pattern: "m/d/yy" } } },
        transaction.action === "recount" ? {} : { userEnteredValue: { numberValue: (transaction.action === "spend" ? -transaction.cents : transaction.cents) / 100 }, userEnteredFormat: moneyFormat },
        { userEnteredValue: transaction.action === "recount"
          ? { numberValue: transaction.cents / 100 }
          : { formulaValue: "=INDEX(C:C,ROW()-1)+INDEX(B:B,ROW())" }, userEnteredFormat: moneyFormat },
        { userEnteredValue: { stringValue: transaction.description } },
      ] }],
      fields: "userEnteredValue,userEnteredFormat.numberFormat",
    } }],
  };
}
