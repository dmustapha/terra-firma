// File: scripts/lib/env.ts
// Loads RPC endpoints without ever printing them. Order: RPC_URL (CI / keeper), GetBlock FRA, GetBlock NYC, public.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PUBLIC_RPC } from "../../web/lib/config";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const WEB_DATA = path.join(ROOT, "web", "data");

const SECRETS = path.resolve(ROOT, "..", ".env.local");
if (existsSync(SECRETS)) config({ path: SECRETS, quiet: true });

export function providers(): string[] {
  const urls = [process.env.RPC_URL, process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC, process.env.PUBLIC_RPC, PUBLIC_RPC];
  return [...new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))];
}

/**
 * eth_getLogs endpoints. VERIFIED 2026-11-11: both GetBlock shared endpoints answer "Block range is too large" for
 * spans > 1,000 blocks, while the public RPC allows 10M (single address). Wide log scans therefore go public-first.
 */
export function logProviders(): string[] {
  const pub = [process.env.PUBLIC_RPC, PUBLIC_RPC].filter((u): u is string => typeof u === "string" && u.length > 0);
  return [...new Set(pub)];
}

/** Host only, so logs can say which provider answered without leaking the access token in the path. */
export const hostOf = (url: string) => new URL(url).host;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`missing env ${name}`);
    process.exit(1);
  }
  return v;
}

export const hasFlag = (f: string) => process.argv.includes(f);
