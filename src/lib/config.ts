import "server-only";
import { AppError } from "./errors";

export type SheetConnection = { googleSub: string; displayName: string; spreadsheetId: string; sheetId: number };

export function appUrl(): string {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new AppError("CONFIGURATION", "Configure an HTTPS app URL before deployment.", 503);
  return url.origin;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new AppError("CONFIGURATION", "Google sign-in is not configured yet. Follow the setup guide in the project README.", 503);
  return value;
}

export function familyMembers(): SheetConnection[] {
  let members: unknown;
  try { members = JSON.parse(process.env.FAMILY_MEMBERS || "[]"); }
  catch { throw new AppError("CONFIGURATION", "The family account configuration needs attention.", 503); }
  if (!Array.isArray(members) || !members.every(member => member && typeof member.googleSub === "string" && member.googleSub.length > 0 && typeof member.displayName === "string" && typeof member.spreadsheetId === "string" && /^[\w-]+$/.test(member.spreadsheetId) && Number.isInteger(member.sheetId) && member.sheetId >= 0)) {
    throw new AppError("CONFIGURATION", "The family account configuration needs attention.", 503);
  }
  if (new Set(members.map(member => member.googleSub)).size !== members.length) throw new AppError("CONFIGURATION", "Each Google account must have exactly one spreadsheet connection.", 503);
  return members;
}

// Admission and connection lookup stay separate so public onboarding can replace
// this resolver without changing the ledger or UI.
export function isAllowedAccount(googleSub: string): boolean {
  return familyMembers().some(member => member.googleSub === googleSub);
}

export function resolveSheetConnection(googleSub: string): SheetConnection {
  const connection = familyMembers().find(member => member.googleSub === googleSub);
  if (!connection) throw new AppError("NOT_ALLOWED", "This Google account is not connected to Piggybank.", 403);
  return connection;
}

export function writesEnabled(): boolean { return process.env.ENABLE_SHEET_WRITES === "true"; }
export function demoEnabled(): boolean { return process.env.NODE_ENV === "development" && process.env.DEV_DEMO_MODE === "true"; }

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}
