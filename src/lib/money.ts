import { AppError } from "./errors";

// Limit individual entries to $999,999.99 and never calculate money with floats.
export function parseMoney(value: unknown, allowZero = false): number {
  if (typeof value !== "string" || !/^\d{1,6}(\.\d{1,2})?$/.test(value.trim())) {
    throw new AppError("INVALID_AMOUNT", "Enter an amount with up to two decimal places (up to $999,999.99).");
  }
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!allowZero && cents === 0) throw new AppError("INVALID_AMOUNT", "Enter an amount greater than zero.");
  return cents;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
