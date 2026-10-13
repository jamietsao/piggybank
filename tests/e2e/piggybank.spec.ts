import { expect, test } from "@playwright/test";
import type { Ledger, TransactionInput } from "../../src/lib/types";

const initial: Ledger = {
  balanceCents: 27000, canWrite: true, problem: null,
  entries: Array.from({ length: 25 }, (_, index) => ({ row: 26 - index, date: "10/10/26", description: index === 0 ? "A new book" : `Earlier entry ${index}`, amountCents: index === 0 ? -2000 : 100, balanceCents: 27000, kind: index === 0 ? "spend" : "add" })),
};

test.beforeEach(async ({ page }) => {
  let ledger = structuredClone(initial);
  await page.route("**/api/ledger", route => route.fulfill({ json: ledger }));
  await page.route("**/api/transactions", async route => {
    const entry = route.request().postDataJSON() as TransactionInput;
    const cents = Math.round(Number(entry.amount) * 100);
    const signed = entry.action === "spend" ? -cents : cents;
    ledger = { ...ledger, balanceCents: entry.action === "recount" ? cents : ledger.balanceCents! + signed };
    ledger.entries = [{ row: ledger.entries[0].row + 1, date: entry.date, description: entry.description || "Recounted cash", amountCents: entry.action === "recount" ? null : signed, balanceCents: ledger.balanceCents, kind: entry.action }, ...ledger.entries];
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/");
  await expect(page.getByLabel("Current balance")).toContainText("$270.00");
});

test("shows history progressively without a spreadsheet-opening link or horizontal overflow", async ({ page }, testInfo) => {
  await expect(page.locator(".transaction-row")).toHaveCount(20);
  await page.screenshot({ path: testInfo.outputPath("dashboard.png") });
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.locator(".transaction-row")).toHaveCount(25);
  await expect(page.getByRole("link", { name: /spreadsheet/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("sends only the app origin to Google Picker for its website-restricted key", async ({ page }) => {
  const pickerUrl = "https://docs.google.com/picker?referrer-probe=1";
  // Intercept Google's URL so this checks browser behavior without contacting
  // Google or requesting any real credentials.
  await page.route(pickerUrl, route => route.fulfill({ contentType: "text/html", body: "<p>Picker referrer check</p>" }));
  await page.goto("/?private-query=must-not-be-shared");
  const request = page.waitForRequest(pickerUrl);
  await page.evaluate(url => {
    const frame = document.createElement("iframe");
    frame.title = "Picker referrer check";
    frame.src = url;
    document.body.appendChild(frame);
  }, pickerUrl);
  expect(await (await request).headerValue("referer")).toBe("http://localhost:3000/");
});

test("adds money with a backdated entry and literal formula-like description", async ({ page }) => {
  await page.getByRole("button", { name: "Add money" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("12.34");
  await page.getByLabel("Description").fill("=Birthday money");
  await page.getByLabel("Date", { exact: true }).fill("2024-02-29");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Current balance")).toContainText("$282.34");
  await expect(page.locator(".transaction-row").first()).toContainText("=Birthday money");
  await expect(page.locator(".transaction-row").first()).toContainText("2024-02-29");
});

test("warns before recording a negative balance", async ({ page }) => {
  await page.getByRole("button", { name: "Spend money" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("300");
  await page.getByLabel("Description").fill("A big purchase");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog")).toContainText("below zero");
  await expect(page.getByLabel("Current balance")).toContainText("$270.00");
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.getByLabel("Current balance")).toContainText("-$30.00");
});

test("confirms a zero-dollar recount and displays it as a balance reset", async ({ page }) => {
  await page.getByRole("button", { name: "Recount cash" }).click();
  await page.getByLabel("Counted total").fill("0");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog")).toContainText("from $270.00 to $0.00");
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.getByLabel("Current balance")).toContainText("$0.00");
  await expect(page.locator(".transaction-row").first()).toContainText("Balance set");
});

test("preserves a failed draft and requires checking history before retrying an uncertain save", async ({ page }) => {
  await page.route("**/api/transactions", route => route.fulfill({ status: 503, json: { error: "Check history before trying again.", code: "SAVE_UNCERTAIN", uncertain: true } }));
  await page.getByRole("button", { name: "Add money" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("5.25");
  await page.getByLabel("Description").fill("Pocket money");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Check history");
  await page.getByRole("button", { name: "Close and check history" }).click();
  await page.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("5.25");
  await expect(page.getByLabel("Description")).toHaveValue("Pocket money");
  await expect(page.getByRole("button", { name: "Save entry" })).toHaveCount(0);
});

test("prevents repeated taps during an in-flight save", async ({ page }) => {
  let count = 0;
  await page.route("**/api/transactions", async route => {
    ++count;
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ json: { saved: true } });
  });
  await page.getByRole("button", { name: "Add money" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("5");
  await page.getByLabel("Description").fill("Gift");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(count).toBe(1);
});

test("blocks entries when the latest balance needs repair", async ({ page }) => {
  await page.route("**/api/ledger", route => route.fulfill({ json: { ...initial, balanceCents: null, canWrite: false, problem: "The latest row has no valid balance." } }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no valid balance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add money" })).toBeDisabled();
});
