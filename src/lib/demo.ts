import "server-only";
import type { Ledger } from "./types";
import { localToday } from "./money";
import { requireConfirmation, type ValidatedTransaction } from "./transactions";

// Fictional local-only preview. Never used in production or written to Google.
const initial: Ledger = {
  balanceCents: 27000, canWrite: true, problem: null,
  entries: [
    { row: 6, date: "10/8/26", description: "Books for the weekend", amountCents: -2000, balanceCents: 27000, kind: "spend" },
    { row: 5, date: "10/6/26", description: "Helping in the garden", amountCents: 1500, balanceCents: 29000, kind: "add" },
    { row: 4, date: "10/4/26", description: "Recounted cash", amountCents: null, balanceCents: 27500, kind: "recount" },
    { row: 3, date: "10/2/26", description: "Birthday gift", amountCents: 2500, balanceCents: 28000, kind: "add" },
    { row: 2, date: "10/1/26", description: "Starting my piggybank", amountCents: 25500, balanceCents: 25500, kind: "add" },
  ],
};
const demoGlobal = globalThis as typeof globalThis & { piggybankDemo?: Ledger };
export function readDemo() { demoGlobal.piggybankDemo ??= structuredClone(initial); return demoGlobal.piggybankDemo; }
export function appendDemo(transaction: ValidatedTransaction) {
  const ledger = readDemo();
  const balance = ledger.balanceCents!;
  requireConfirmation(transaction, balance);
  const signedAmount = transaction.action === "spend" ? -transaction.cents : transaction.cents;
  ledger.balanceCents = transaction.action === "recount" ? transaction.cents : balance + signedAmount;
  ledger.entries.unshift({ row: (ledger.entries[0]?.row || 1) + 1, date: transaction.date || localToday(), description: transaction.description, amountCents: transaction.action === "recount" ? null : signedAmount, balanceCents: ledger.balanceCents, kind: transaction.action });
}
