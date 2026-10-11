import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { appUrl } from "./config";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return json({ error: error.message, code: error.code, uncertain: error.uncertain }, error.status);
  // Never log Google responses/tokens or user descriptions.
  console.error("Piggybank request failed unexpectedly.");
  return json({ error: "Something went wrong. Please try again.", code: "INTERNAL" }, 500);
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appUrl()) throw new AppError("FORBIDDEN", "Reload Piggybank and try again.", 403);
}

export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("INVALID_INPUT", "Send a valid entry.", 400);
  const body = await request.text();
  if (body.length > 10_000) throw new AppError("INVALID_INPUT", "This entry is too long.", 413);
  try { return JSON.parse(body); }
  catch { throw new AppError("INVALID_INPUT", "Check your entry and try again."); }
}
