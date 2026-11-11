// File: scripts/lib/files.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Address } from "viem";
import type { Registry } from "../../web/lib/registry";
import { WEB_DATA } from "./env";

export const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

export function writeJson(file: string, value: unknown, pretty = true) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : undefined) + "\n");
}

export const loadRegistry = () => readJson<Registry>(path.join(WEB_DATA, "memes.json"));

export interface Deployments {
  deployed: boolean;
  chainId: number;
  block: number;
  start: number;
  StockOracle: Address;
  Jar: Address;
  WifStaking: Address;
  FeePool: Address;
  TerraRouter: Address;
  HindsightLens: Address;
  FriendJar: Address;
}

export const CONTRACT_NAMES = ["StockOracle", "Jar", "WifStaking", "FeePool", "TerraRouter", "HindsightLens", "FriendJar"] as const;

/** Deployed addresses or null when web/data/deployments.json still carries the pre-deploy zero placeholder. */
export function loadDeployments(): Deployments | null {
  const file = path.join(WEB_DATA, "deployments.json");
  if (!existsSync(file)) return null;
  const d = readJson<Deployments>(file);
  const zero = CONTRACT_NAMES.some((n) => /^0x0{40}$/i.test(d[n]));
  return d.deployed && !zero && d.chainId === 4663 ? d : null;
}

export const fmtUnits = (v: bigint, dec: number, digits = 6) => {
  const s = (Number(v) / 10 ** dec).toFixed(digits);
  return s;
};
