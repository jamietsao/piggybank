export type Action = "add" | "spend" | "recount";

export type TransactionInput = {
  action: Action;
  amount: string;
  description: string;
  date: string;
  confirmed?: boolean;
  expectedBalanceCents?: number;
};

export type LedgerEntry = {
  row: number;
  date: string;
  description: string;
  amountCents: number | null;
  balanceCents: number | null;
  kind: Action;
};

export type Ledger = {
  balanceCents: number | null;
  entries: LedgerEntry[];
  canWrite: boolean;
  problem: string | null;
};

export type Viewer = { name: string; demo: boolean };

export type ApiError = { error: string; code: string; uncertain?: boolean };
